import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  extractQrBase64,
  extractStatus,
  getUazApiConfig,
  isConnectedStatus,
  uazApiFetch,
} from "../_shared/uazapi.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const authSupabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: { user }, error: authError } = await authSupabase.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { workspace_id } = await req.json();

    if (!workspace_id) {
      return new Response(JSON.stringify({ error: "workspace_id é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: member } = await supabaseAdmin
      .from("workspace_members")
      .select("id")
      .eq("user_id", user.id)
      .eq("workspace_id", workspace_id)
      .maybeSingle();

    if (!member) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const config = getUazApiConfig();
    if (!config) {
      return new Response(JSON.stringify({ error: "Servidor de WhatsApp QR não configurado. Contate o suporte." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const instanceName = `agendix-${workspace_id.substring(0, 8)}`;

    // Check current status (best-effort)
    let isConnected = false;
    try {
        const statusRes = await uazApiFetch(config, {
          method: "GET",
          pathCandidates: [
            `/instance/status?instance=${encodeURIComponent(instanceName)}`,
            `/v1/instance/status?instance=${encodeURIComponent(instanceName)}`,
          ],
        });
      const state = extractStatus(statusRes.data);
      isConnected = isConnectedStatus(state);
      console.log(`[whatsapp-qr-create] Status path=${statusRes.pathUsed} auth=${statusRes.authMode} state=${state}`);
    } catch (e) {
      console.warn("[whatsapp-qr-create] Could not verify status before connect:", e);
    }

    if (isConnected) {
      try {
        const disconnectRes = await uazApiFetch(config, {
          method: "POST",
          pathCandidates: ["/instance/disconnect", "/v1/instance/disconnect"],
          body: { instanceName, instance: instanceName },
        });
        console.log(`[whatsapp-qr-create] Disconnect path=${disconnectRes.pathUsed} auth=${disconnectRes.authMode}`);
        await new Promise((r) => setTimeout(r, 1200));
      } catch (e) {
        console.warn("[whatsapp-qr-create] Disconnect failed, continuing:", e);
      }
    }

    const connectRes = await uazApiFetch(config, {
      method: "POST",
      pathCandidates: ["/instance/connect", "/v1/instance/connect", "/instance/init", "/v1/instance/init"],
      body: { instanceName, instance: instanceName, name: instanceName },
    });

    console.log(`[whatsapp-qr-create] Connect path=${connectRes.pathUsed} auth=${connectRes.authMode}`);

    let qrBase64 = extractQrBase64(connectRes.data);

    if (!qrBase64) {
      try {
        const qrRes = await uazApiFetch(config, {
          method: "GET",
          pathCandidates: [
            `/instance/qr?instance=${encodeURIComponent(instanceName)}`,
            `/v1/instance/qr?instance=${encodeURIComponent(instanceName)}`,
          ],
        });
        console.log(`[whatsapp-qr-create] QR path=${qrRes.pathUsed} auth=${qrRes.authMode}`);
        qrBase64 = extractQrBase64(qrRes.data);
      } catch (e) {
        console.warn("[whatsapp-qr-create] Could not fetch QR endpoint:", e);
      }
    }

    const qrSrc = qrBase64
      ? (qrBase64.startsWith("data:") ? qrBase64 : `data:image/png;base64,${qrBase64}`)
      : null;

    // Configure webhook (best-effort)
    const webhookUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/whatsapp-qr-webhook`;
    try {
      const webhookRes = await uazApiFetch(config, {
        method: "POST",
        pathCandidates: ["/webhook/set", "/v1/webhook/set"],
        body: {
          url: webhookUrl,
          enabled: true,
          events: ["connection", "qrcode", "status", "CONNECTION_UPDATE", "QRCODE_UPDATED", "STATUS_INSTANCE"],
          instanceName,
        },
      });
      console.log(`[whatsapp-qr-create] Webhook path=${webhookRes.pathUsed} auth=${webhookRes.authMode}`);
    } catch (e) {
      console.warn("[whatsapp-qr-create] Could not set webhook:", e);
    }

    const { error: dbError } = await supabaseAdmin
      .from("whatsapp_instances_qr")
      .upsert({
        workspace_id,
        instance_key: instanceName,
        status: qrSrc ? "connecting" : "disconnected",
        qr_code: qrSrc,
      }, { onConflict: "workspace_id" });

    if (dbError) {
      console.error("[whatsapp-qr-create] DB error:", dbError);
    }

    return new Response(JSON.stringify({
      success: true,
      instance_key: instanceName,
      qr: qrSrc,
      status: qrSrc ? "connecting" : "disconnected",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[whatsapp-qr-create] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
