import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

  const UAZAPI_BASE_URL = Deno.env.get("UAZAPI_BASE_URL");
  const UAZAPI_INSTANCE_TOKEN = Deno.env.get("UAZAPI_INSTANCE_TOKEN");

  try {
    // Get workspaces with daily summary enabled
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
    const dayStart = new Date(today);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(today);
    dayEnd.setHours(23, 59, 59, 999);

    const dateStr = today.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
    let sent = 0;

    for (const pref of prefs) {
      const wsId = pref.workspace_id;

      // Check WhatsApp connection
      const { data: qrInst } = await supabase
        .from("whatsapp_instances_qr")
        .select("instance_key, status")
        .eq("workspace_id", wsId)
        .eq("status", "connected")
        .maybeSingle();

      if (!qrInst?.instance_key) continue;

      // Get workspace owner phone
      const { data: ws } = await supabase
        .from("workspaces")
        .select("name, owner_id")
        .eq("id", wsId)
        .maybeSingle();
      if (!ws) continue;

      // Get owner profile to find their phone (from workspace_members -> profiles)
      // We need the owner's phone. Check if there's a client record or use workspace name
      // For now, get the owner's phone from the whatsapp instance phone_number
      const { data: qrFull } = await supabase
        .from("whatsapp_instances_qr")
        .select("phone_number")
        .eq("workspace_id", wsId)
        .eq("status", "connected")
        .maybeSingle();

      const ownerPhone = qrFull?.phone_number;
      if (!ownerPhone) {
        console.log(`[daily-summary] No owner phone for workspace ${wsId}`);
        continue;
      }

      // Today's appointments
      const { data: appointments } = await supabase
        .from("appointments")
        .select("starts_at, clients(full_name)")
        .eq("workspace_id", wsId)
        .gte("starts_at", dayStart.toISOString())
        .lte("starts_at", dayEnd.toISOString())
        .in("status", ["scheduled", "confirmed"])
        .order("starts_at", { ascending: true });

      // Pending payments
      const { data: payments } = await supabase
        .from("payment_links")
        .select("amount_cents, clients(full_name)")
        .eq("workspace_id", wsId)
        .eq("paid", false);

      // Build message
      const aptCount = appointments?.length ?? 0;
      const payCount = payments?.length ?? 0;

      let msg = `📋 *Resumo do dia - ${dateStr}*\n\n`;

      if (aptCount > 0) {
        msg += `📅 *Sessões de hoje (${aptCount}):*\n`;
        for (const apt of appointments!) {
          const time = new Date(apt.starts_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
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

      // Send via UazAPI
      if (UAZAPI_BASE_URL && UAZAPI_INSTANCE_TOKEN) {
        const encodedInstance = encodeURIComponent(qrInst.instance_key);
        let phone = ownerPhone.replace(/\D/g, "");
        if (!phone.startsWith("55")) phone = "55" + phone;

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 30000);

        try {
          const resp = await fetch(
            `${UAZAPI_BASE_URL}/message/sendText?instance=${encodedInstance}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${UAZAPI_INSTANCE_TOKEN}`,
              },
              body: JSON.stringify({ number: phone, text: msg }),
              signal: controller.signal,
            }
          );
          clearTimeout(timer);
          const body = await resp.text();
          console.log(`[daily-summary] Sent to ${phone}: ${resp.status} ${body}`);
        } catch (e: any) {
          clearTimeout(timer);
          console.error(`[daily-summary] Send error:`, e.message);
        }
      }

      // Insert dashboard notification
      await supabase.from("notifications").insert({
        workspace_id: wsId,
        title: `Resumo do dia - ${dateStr}`,
        body: `${aptCount} sessões hoje, ${payCount} pagamentos pendentes`,
        type: "daily_summary",
      });

      sent++;
    }

    return new Response(JSON.stringify({ success: true, sent }), {
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
