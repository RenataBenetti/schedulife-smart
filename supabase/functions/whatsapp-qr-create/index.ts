import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  extractInstanceToken,
  extractQrBase64,
  extractStatus,
  getUazApiAdminConfig,
  getUazApiConfigForToken,
  isConnectedStatus,
  uazApiFetch,
} from "../_shared/uazapi.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { workspace_id } = await req.json();
    if (!workspace_id) {
      return new Response(JSON.stringify({ error: "workspace_id é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminConfig = getUazApiAdminConfig();
    if (!adminConfig) {
      return new Response(JSON.stringify({ error: "UAZAPI_ADMIN_TOKEN ou UAZAPI_BASE_URL não configurado." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const instanceName = `agendix-${workspace_id.substring(0, 8)}`;

    // Load existing record (may have a previously generated instance_token)
    const { data: existing } = await supabaseAdmin
      .from("whatsapp_instances_qr")
      .select("*")
      .eq("workspace_id", workspace_id)
      .maybeSingle();

    let instanceToken: string | null = existing?.instance_token ?? null;

    // If we don't have an instance token yet, initialize a new instance via admin token
    if (!instanceToken) {
      try {
        const initRes = await uazApiFetch(adminConfig, {
          method: "POST",
          pathCandidates: ["/instance/init", "/v1/instance/init"],
          body: { name: instanceName, instanceName, instance: instanceName },
        });
        console.log(`[whatsapp-qr-create] Init path=${initRes.pathUsed} auth=${initRes.authMode}`);
        instanceToken = extractInstanceToken(initRes.data);
        if (!instanceToken) {
          console.error("[whatsapp-qr-create] init returned no token:", JSON.stringify(initRes.data));
          return new Response(JSON.stringify({
            error: "Falha ao inicializar instância UazAPI: token não retornado.",
            details: initRes.data,
          }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      } catch (e: any) {
        console.error("[whatsapp-qr-create] init failed:", e?.message);
        return new Response(JSON.stringify({ error: `Falha em /instance/init: ${e?.message}` }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const config = getUazApiConfigForToken(instanceToken!)!;

    // Check current status (best-effort)
    let isConnected = false;
    try {
      const statusRes = await uazApiFetch(config, {
        method: "GET",
        pathCandidates: ["/instance/status", "/v1/instance/status"],
      });
      const state = extractStatus(statusRes.data);
      isConnected = isConnectedStatus(state);
      console.log(`[whatsapp-qr-create] Status path=${statusRes.pathUsed} state=${state}`);
    } catch (e) {
      console.warn("[whatsapp-qr-create] status check failed (continuing):", e);
    }

    if (isConnected) {
      try {
        await uazApiFetch(config, {
          method: "POST",
          pathCandidates: ["/instance/disconnect", "/v1/instance/disconnect"],
          body: {},
        });
        await new Promise((r) => setTimeout(r, 1200));
      } catch (e) {
        console.warn("[whatsapp-qr-create] disconnect failed, continuing:", e);
      }
    }

    const connectRes = await uazApiFetch(config, {
      method: "POST",
      pathCandidates: ["/instance/connect", "/v1/instance/connect"],
      body: {},
    });
    console.log(`[whatsapp-qr-create] Connect path=${connectRes.pathUsed}`);

    let qrBase64 = extractQrBase64(connectRes.data);
    if (!qrBase64) {
      try {
        const qrRes = await uazApiFetch(config, {
          method: "GET",
          pathCandidates: ["/instance/qr", "/v1/instance/qr", "/instance/qrcode", "/v1/instance/qrcode"],
        });
        qrBase64 = extractQrBase64(qrRes.data);
      } catch (e) {
        console.warn("[whatsapp-qr-create] QR fetch failed:", e);
      }
    }

    const qrSrc = qrBase64
      ? (qrBase64.startsWith("data:") ? qrBase64 : `data:image/png;base64,${qrBase64}`)
      : null;

    // Configure webhook (best-effort)
    const webhookUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/whatsapp-qr-webhook`;
    try {
      await uazApiFetch(config, {
        method: "POST",
        pathCandidates: ["/webhook/set", "/v1/webhook/set", "/webhook"],
        body: {
          url: webhookUrl,
          enabled: true,
          events: ["connection", "qrcode", "status", "CONNECTION_UPDATE", "QRCODE_UPDATED", "STATUS_INSTANCE"],
        },
      });
    } catch (e) {
      console.warn("[whatsapp-qr-create] webhook setup failed:", e);
    }

    const { error: dbError } = await supabaseAdmin
      .from("whatsapp_instances_qr")
      .upsert({
        workspace_id,
        instance_key: instanceName,
        instance_token: instanceToken,
        status: qrSrc ? "connecting" : "disconnected",
        qr_code: qrSrc,
      }, { onConflict: "workspace_id" });

    if (dbError) console.error("[whatsapp-qr-create] DB error:", dbError);

    return new Response(JSON.stringify({
      success: true,
      instance_key: instanceName,
      qr: qrSrc,
      status: qrSrc ? "connecting" : "disconnected",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("[whatsapp-qr-create] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
