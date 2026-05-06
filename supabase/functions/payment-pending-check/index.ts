import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getUazApiConfigForToken, uazApiFetch } from "../_shared/uazapi.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function formatCents(cents: number): string {
  return `R$ ${(cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { data: prefs } = await supabase
      .from("notification_preferences")
      .select("workspace_id")
      .eq("notify_payment_pending", true);

    if (!prefs || prefs.length === 0) {
      return new Response(JSON.stringify({ message: "no workspaces" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const threshold = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    let sent = 0;

    for (const pref of prefs) {
      const wsId = pref.workspace_id;

      const { data: payments } = await supabase
        .from("payment_links")
        .select("amount_cents, created_at, clients(full_name)")
        .eq("workspace_id", wsId)
        .eq("paid", false)
        .lt("created_at", threshold);

      if (!payments || payments.length === 0) continue;

      const { data: qrInst } = await supabase
        .from("whatsapp_instances_qr")
        .select("instance_token, phone_number")
        .eq("workspace_id", wsId)
        .eq("status", "connected")
        .maybeSingle();

      const total = payments.reduce((s, p) => s + (p.amount_cents ?? 0), 0);
      let msg = `⚠️ *Pagamentos pendentes há mais de 3 dias (${payments.length})*\n\n`;
      for (const p of payments) {
        const name = (p.clients as any)?.full_name ?? "—";
        const days = Math.floor((Date.now() - new Date(p.created_at).getTime()) / 86400000);
        msg += `• ${name} - ${formatCents(p.amount_cents)} (${days}d)\n`;
      }
      msg += `\n*Total:* ${formatCents(total)}`;

      let sendOk = false;
      let sendErr: string | null = null;

      if (qrInst?.instance_token && qrInst?.phone_number) {
        let phone = qrInst.phone_number.replace(/\D/g, "");
        if (!phone.startsWith("55")) phone = "55" + phone;
        const config = getUazApiConfigForToken(qrInst.instance_token);
        if (config) {
          try {
            await uazApiFetch(config, {
              method: "POST",
              authType: "instance",
              pathCandidates: ["/send/text"],
              body: { number: phone, text: msg },
              timeoutMs: 30000,
            });
            sendOk = true;
            sent++;
          } catch (e: any) {
            sendErr = e?.message ?? String(e);
            console.error(`[payment-pending] send err ws=${wsId}:`, sendErr);
          }
        }
      } else {
        sendErr = "WhatsApp não conectado";
      }

      await supabase.from("notifications").insert({
        workspace_id: wsId,
        title: `${payments.length} pagamento(s) pendente(s) há mais de 3 dias`,
        body: sendOk
          ? `Total ${formatCents(total)}. Enviado por WhatsApp.`
          : `Total ${formatCents(total)}. ${sendErr ?? ""}`,
        type: sendOk ? "payment_pending" : "system_error",
      });
    }

    return new Response(JSON.stringify({ success: true, sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[payment-pending] error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
