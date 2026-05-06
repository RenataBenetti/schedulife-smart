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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { data: prefs } = await supabase
      .from("notification_preferences")
      .select("workspace_id")
      .eq("notify_daily_summary", true);

    if (!prefs || prefs.length === 0) {
      return new Response(JSON.stringify({ message: "No workspaces with daily summary enabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const today = new Date();
    const dayStart = new Date(today); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(today); dayEnd.setHours(23, 59, 59, 999);
    const dateStr = today.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

    let sent = 0;
    const errors: any[] = [];

    for (const pref of prefs) {
      const wsId = pref.workspace_id;

      const { data: qrInst } = await supabase
        .from("whatsapp_instances_qr")
        .select("instance_token, phone_number, status")
        .eq("workspace_id", wsId)
        .eq("status", "connected")
        .maybeSingle();

      if (!qrInst?.instance_token || !qrInst?.phone_number) {
        console.log(`[daily-summary] Workspace ${wsId} sem instância conectada/token/telefone`);
        continue;
      }

      const { data: appointments } = await supabase
        .from("appointments")
        .select("starts_at, clients(full_name)")
        .eq("workspace_id", wsId)
        .gte("starts_at", dayStart.toISOString())
        .lte("starts_at", dayEnd.toISOString())
        .in("status", ["scheduled", "confirmed"])
        .order("starts_at", { ascending: true });

      const { data: payments } = await supabase
        .from("payment_links")
        .select("amount_cents, clients(full_name)")
        .eq("workspace_id", wsId)
        .eq("paid", false);

      const aptCount = appointments?.length ?? 0;
      const payCount = payments?.length ?? 0;

      let msg = `📋 *Resumo do dia - ${dateStr}*\n\n`;
      if (aptCount > 0) {
        msg += `📅 *Sessões de hoje (${aptCount}):*\n`;
        for (const apt of appointments!) {
          const time = new Date(apt.starts_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
          const name = (apt.clients as any)?.full_name ?? "—";
          msg += `• ${time} - ${name}\n`;
        }
      } else {
        msg += `📅 *Nenhuma sessão agendada para hoje*\n`;
      }
      msg += `\n`;
      if (payCount > 0) {
        const total = payments!.reduce((s, p) => s + p.amount_cents, 0);
        msg += `💰 *Pagamentos pendentes (${payCount}):*\n`;
        for (const p of payments!) {
          const name = (p.clients as any)?.full_name ?? "—";
          msg += `• ${name} - ${formatCents(p.amount_cents)}\n`;
        }
        msg += `• Total: ${formatCents(total)}\n`;
      } else {
        msg += `💰 *Nenhum pagamento pendente* ✅\n`;
      }
      msg += `\nBom trabalho! 💪`;

      let phone = qrInst.phone_number.replace(/\D/g, "");
      if (!phone.startsWith("55")) phone = "55" + phone;

      const config = getUazApiConfigForToken(qrInst.instance_token);
      let sendOk = false;
      let sendErr: string | null = null;

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
          console.error(`[daily-summary] Send error ws=${wsId}:`, sendErr);
          errors.push({ workspace_id: wsId, error: sendErr });
        }
      } else {
        sendErr = "UAZAPI base url não configurado";
      }

      await supabase.from("notifications").insert({
        workspace_id: wsId,
        title: sendOk ? `Resumo do dia - ${dateStr}` : `Falha ao enviar resumo do dia`,
        body: sendOk
          ? `${aptCount} sessões hoje, ${payCount} pagamentos pendentes`
          : `Não foi possível enviar pelo WhatsApp: ${sendErr?.slice(0, 200) ?? "erro desconhecido"}. Verifique a conexão em Configurações → Integrações.`,
        type: sendOk ? "daily_summary" : "system_error",
      });
    }

    return new Response(JSON.stringify({ success: true, sent, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[daily-summary] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
