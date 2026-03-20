import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    // Verify membership
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

    const UAZAPI_BASE_URL = Deno.env.get("UAZAPI_BASE_URL");
    const UAZAPI_INSTANCE_TOKEN = Deno.env.get("UAZAPI_INSTANCE_TOKEN");

    if (!UAZAPI_BASE_URL || !UAZAPI_INSTANCE_TOKEN) {
      return new Response(JSON.stringify({ error: "Servidor de WhatsApp QR não configurado. Contate o suporte." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const baseUrl = UAZAPI_BASE_URL.replace(/\/$/, "");
    const headers = { "token": UAZAPI_INSTANCE_TOKEN, "Content-Type": "application/json" };
    const instanceName = `agendix-${workspace_id.substring(0, 8)}`;

    // Step 1: Check current status
    console.log(`[whatsapp-qr-create] Checking status for UazAPI instance`);
    let isConnected = false;

    try {
      const statusRes = await fetch(`${baseUrl}/instance/status`, { headers });
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        console.log(`[whatsapp-qr-create] Status:`, JSON.stringify(statusData));
        const state = statusData?.status ?? statusData?.state ?? statusData?.instance?.state ?? "";
        isConnected = state === "connected" || state === "open";
      }
    } catch (e) {
      console.error(`[whatsapp-qr-create] Error checking status:`, e);
    }

    // Step 2: If connected, disconnect first to generate new QR
    if (isConnected) {
      console.log(`[whatsapp-qr-create] Instance is connected, disconnecting to force new QR...`);
      try {
        const disconnectRes = await fetch(`${baseUrl}/instance/disconnect`, {
          method: "POST",
          headers,
        });
        const disconnectData = await disconnectRes.text();
        console.log(`[whatsapp-qr-create] Disconnect response (${disconnectRes.status}):`, disconnectData);
        await new Promise((r) => setTimeout(r, 2000));
      } catch (e) {
        console.error(`[whatsapp-qr-create] Disconnect error:`, e);
      }
    }

    // Step 3: Connect (generates QR code)
    console.log(`[whatsapp-qr-create] Connecting to generate QR code`);
    const connectRes = await fetch(`${baseUrl}/instance/connect`, {
      method: "POST",
      headers,
    });
    const connectData = await connectRes.json();
    console.log(`[whatsapp-qr-create] Connect response (${connectRes.status}):`, JSON.stringify(connectData));

    // Step 4: Get QR code
    let qrSrc: string | null = null;

    // Try to get QR from connect response first
    const qrFromConnect = connectData?.qrcode ?? connectData?.base64 ?? connectData?.qr ?? null;
    if (qrFromConnect) {
      qrSrc = qrFromConnect.startsWith("data:") ? qrFromConnect : `data:image/png;base64,${qrFromConnect}`;
    }

    // If not in connect response, fetch via dedicated QR endpoint
    if (!qrSrc) {
      await new Promise((r) => setTimeout(r, 1500));
      try {
        const qrRes = await fetch(`${baseUrl}/instance/qr`, { headers });
        if (qrRes.ok) {
          const qrData = await qrRes.json();
          console.log(`[whatsapp-qr-create] QR response:`, JSON.stringify(qrData).substring(0, 200));
          const qrBase64 = qrData?.qrcode ?? qrData?.base64 ?? qrData?.qr ?? null;
          if (qrBase64) {
            qrSrc = qrBase64.startsWith("data:") ? qrBase64 : `data:image/png;base64,${qrBase64}`;
          }
        }
      } catch (e) {
        console.error(`[whatsapp-qr-create] Error fetching QR:`, e);
      }
    }

    // If still connected and no QR, return connected status
    if (!qrSrc && isConnected) {
      console.log(`[whatsapp-qr-create] Instance still connected, returning connected status`);
      return new Response(JSON.stringify({
        success: true,
        instance_key: instanceName,
        qr: null,
        already_connected: true,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Configure webhook
    const webhookUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/whatsapp-qr-webhook`;
    try {
      await fetch(`${baseUrl}/webhook/set`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          url: webhookUrl,
          enabled: true,
          events: ["connection", "qrcode", "status"],
        }),
      });
      console.log(`[whatsapp-qr-create] Webhook configured: ${webhookUrl}`);
    } catch (e) {
      console.warn(`[whatsapp-qr-create] Could not set webhook:`, e);
    }

    // Upsert instance record
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
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[whatsapp-qr-create] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
