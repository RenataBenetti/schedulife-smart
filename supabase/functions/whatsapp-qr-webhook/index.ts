import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = await req.json();
    console.log("[whatsapp-qr-webhook] Received:", JSON.stringify(body));

    const event = body?.event;
    const instance = body?.instance;
    const instanceName = instance?.instanceName ?? body?.instanceName;

    if (!instanceName) {
      return new Response(JSON.stringify({ ok: true, message: "No instance name" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle connection update
    if (event === "connection.update" || event === "status.instance") {
      const state = body?.data?.state ?? body?.state ?? "unknown";
      const connected = state === "open";
      const newStatus = connected ? "connected" : "disconnected";

      const { error } = await supabaseAdmin
        .from("whatsapp_instances_qr")
        .update({
          status: newStatus,
          qr_code: connected ? null : undefined,
        })
        .eq("instance_key", instanceName);

      if (error) {
        console.error("[whatsapp-qr-webhook] DB update error:", error);
      }

      console.log(`[whatsapp-qr-webhook] Instance ${instanceName} -> ${newStatus}`);
    }

    // Handle QR code update
    if (event === "qrcode.updated") {
      const qrBase64 = body?.data?.qrcode?.base64 ?? body?.data?.base64;
      if (qrBase64) {
        const qrSrc = qrBase64.startsWith("data:") ? qrBase64 : `data:image/png;base64,${qrBase64}`;
        await supabaseAdmin
          .from("whatsapp_instances_qr")
          .update({ qr_code: qrSrc, status: "connecting" })
          .eq("instance_key", instanceName);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[whatsapp-qr-webhook] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
