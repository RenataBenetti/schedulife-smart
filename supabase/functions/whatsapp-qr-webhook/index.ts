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

    // UazAPI webhook format - detect event type
    const event = body?.event ?? body?.type ?? body?.action;
    const instanceName = body?.instance ?? body?.instanceName ?? body?.instance?.instanceName;

    // Try to find workspace by matching instance_key pattern
    // UazAPI may send instance info differently
    let workspaceFilter: any = {};
    if (instanceName) {
      workspaceFilter = { instance_key: instanceName };
    }

    // Handle connection/status events
    if (event === "connection" || event === "status" || event === "connection.update" || event === "status.instance") {
      const state = body?.data?.state ?? body?.state ?? body?.status ?? body?.data?.status ?? "unknown";
      const connected = state === "connected" || state === "open";
      const newStatus = connected ? "connected" : "disconnected";

      // Extract phone number
      const rawPhone = body?.data?.phone ?? body?.phone ?? body?.data?.me?.id ?? body?.data?.wuid ?? null;
      const phoneNumber = rawPhone ? rawPhone.replace(/@.*$/, "").replace(/\D/g, "") : null;

      let query = supabaseAdmin
        .from("whatsapp_instances_qr")
        .update({
          status: newStatus,
          qr_code: connected ? null : undefined,
          ...(phoneNumber ? { phone_number: phoneNumber } : {}),
        });

      if (instanceName) {
        query = query.eq("instance_key", instanceName);
      }

      const { error } = await query;
      if (error) {
        console.error("[whatsapp-qr-webhook] DB update error:", error);
      }

      console.log(`[whatsapp-qr-webhook] Status -> ${newStatus}${phoneNumber ? ` (phone: ${phoneNumber})` : ""}`);
    }

    // Handle QR code events
    if (event === "qrcode" || event === "qrcode.updated") {
      const qrBase64 = body?.data?.qrcode ?? body?.data?.base64 ?? body?.qrcode ?? body?.base64 ?? body?.data?.qr;
      if (qrBase64) {
        const qrSrc = qrBase64.startsWith("data:") ? qrBase64 : `data:image/png;base64,${qrBase64}`;

        let query = supabaseAdmin
          .from("whatsapp_instances_qr")
          .update({ qr_code: qrSrc, status: "connecting" });

        if (instanceName) {
          query = query.eq("instance_key", instanceName);
        }

        await query;
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
