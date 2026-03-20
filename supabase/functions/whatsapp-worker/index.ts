import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getUazApiConfig, uazApiFetch } from "../_shared/uazapi.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const config = getUazApiConfig();
  if (!config) {
    return new Response(
      JSON.stringify({ error: "UazAPI not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const now = new Date().toISOString();
    const { data: messages, error: fetchErr } = await supabaseAdmin
      .from("whatsapp_outbox")
      .select("*")
      .eq("status", "queued")
      .lte("scheduled_for", now)
      .order("scheduled_for", { ascending: true })
      .limit(20);

    if (fetchErr) {
      console.error("[whatsapp-worker] Fetch error:", fetchErr);
      return new Response(JSON.stringify({ error: fetchErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ processed: 0, message: "No messages in queue" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sent = 0;
    let failed = 0;

    for (const msg of messages) {
      try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const { count: sentToday } = await supabaseAdmin
          .from("whatsapp_outbox")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", msg.workspace_id)
          .in("status", ["sent", "sending"])
          .gte("created_at", todayStart.toISOString());

        const { data: settings } = await supabaseAdmin
          .from("whatsapp_settings")
          .select("daily_limit, send_delay_seconds")
          .eq("workspace_id", msg.workspace_id)
          .maybeSingle();

        const dailyLimit = settings?.daily_limit ?? 100;

        if ((sentToday ?? 0) >= dailyLimit) {
          await supabaseAdmin
            .from("whatsapp_outbox")
            .update({
              status: "failed",
              last_error: `Limite diário atingido (${dailyLimit} mensagens)`,
              attempts: msg.attempts + 1,
            })
            .eq("id", msg.id);
          failed++;
          continue;
        }

        await supabaseAdmin
          .from("whatsapp_outbox")
          .update({ status: "sending", attempts: msg.attempts + 1 })
          .eq("id", msg.id);

        let fullText = msg.message_text;
        if (msg.payment_link) {
          fullText += `\n\n💳 Link de pagamento: ${msg.payment_link}`;
        }

        const cleanPhone = msg.to_phone.replace(/\D/g, "");
        const phone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;

        await uazApiFetch(config, {
          method: "POST",
          pathCandidates: ["/message/sendText", "/v1/message/sendText", "/message/send-text"],
          body: { number: phone, text: fullText },
          timeoutMs: 30000,
        });

        await supabaseAdmin
          .from("whatsapp_outbox")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", msg.id);

        sent++;

        const delayMs = (settings?.send_delay_seconds ?? 5) * 1000;
        if (delayMs > 0) {
          await new Promise((r) => setTimeout(r, delayMs));
        }
      } catch (err: any) {
        console.error(`[whatsapp-worker] Error sending ${msg.id}:`, err.message);
        await supabaseAdmin
          .from("whatsapp_outbox")
          .update({
            status: "failed",
            last_error: err.message,
            attempts: msg.attempts + 1,
          })
          .eq("id", msg.id);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({ processed: messages.length, sent, failed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[whatsapp-worker] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
