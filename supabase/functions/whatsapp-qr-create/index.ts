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

    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      return new Response(JSON.stringify({ error: "Servidor de WhatsApp QR não configurado. Contate o suporte." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const baseUrl = EVOLUTION_API_URL.replace(/\/$/, "");
    const instanceName = `agendix-${workspace_id.substring(0, 8)}`;
    const headers = { "apikey": EVOLUTION_API_KEY, "Content-Type": "application/json" };

    // Step 1: Check if instance already exists
    console.log(`[whatsapp-qr-create] Checking connection state for: ${instanceName}`);
    let instanceExists = false;
    let instanceConnected = false;

    try {
      const stateRes = await fetch(`${baseUrl}/instance/connectionState/${instanceName}`, { headers });
      if (stateRes.ok) {
        const stateData = await stateRes.json();
        console.log(`[whatsapp-qr-create] Connection state:`, JSON.stringify(stateData));
        instanceExists = true;
        const state = stateData?.instance?.state ?? stateData?.state ?? "";
        instanceConnected = state === "open";
      } else if (stateRes.status === 404) {
        console.log(`[whatsapp-qr-create] Instance does not exist yet`);
        instanceExists = false;
      } else {
        const errText = await stateRes.text();
        console.log(`[whatsapp-qr-create] connectionState returned ${stateRes.status}: ${errText}`);
        // Treat as non-existent to try creating
        instanceExists = false;
      }
    } catch (e) {
      console.error(`[whatsapp-qr-create] Error checking state:`, e);
      instanceExists = false;
    }

    // Step 2: If connected, logout first
    if (instanceExists && instanceConnected) {
      console.log(`[whatsapp-qr-create] Instance is connected, logging out first...`);
      try {
        const logoutRes = await fetch(`${baseUrl}/instance/logout/${instanceName}`, {
          method: "DELETE",
          headers,
        });
        const logoutData = await logoutRes.text();
        console.log(`[whatsapp-qr-create] Logout response (${logoutRes.status}):`, logoutData);
        // Brief wait for logout to take effect
        await new Promise((r) => setTimeout(r, 1500));
      } catch (e) {
        console.error(`[whatsapp-qr-create] Logout error:`, e);
      }
    }

    // Step 3: If instance doesn't exist, create it
    if (!instanceExists) {
      console.log(`[whatsapp-qr-create] Creating instance: ${instanceName}`);
      const createRes = await fetch(`${baseUrl}/instance/create`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          instanceName,
          integration: "WHATSAPP-BAILEYS",
          qrcode: true,
        }),
      });

      const createData = await createRes.json();
      console.log(`[whatsapp-qr-create] Create response (${createRes.status}):`, JSON.stringify(createData));

      if (!createRes.ok) {
        // Check if it's "already in use" - treat as existing
        const msg = JSON.stringify(createData).toLowerCase();
        if (createRes.status === 403 && msg.includes("already in use")) {
          console.log(`[whatsapp-qr-create] Instance already exists (403), proceeding to connect`);
          instanceExists = true;
        } else {
          return new Response(JSON.stringify({
            error: "Erro ao criar instância no servidor WhatsApp",
            details: createData,
          }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    // Step 4: Get QR code via connect
    console.log(`[whatsapp-qr-create] Fetching QR via /instance/connect/${instanceName}`);
    const connectRes = await fetch(`${baseUrl}/instance/connect/${instanceName}`, { headers });
    const connectData = await connectRes.json();
    console.log(`[whatsapp-qr-create] Connect response (${connectRes.status}):`, JSON.stringify(connectData));

    // Step 5: Parse QR from multiple possible formats
    const qrBase64 =
      connectData?.base64 ??
      connectData?.qrcode?.base64 ??
      connectData?.qrCode ??
      connectData?.code ??
      connectData?.pairingCode ??
      null;

    let qrSrc: string | null = null;
    if (qrBase64) {
      qrSrc = qrBase64.startsWith("data:") ? qrBase64 : `data:image/png;base64,${qrBase64}`;
    }

    // Upsert instance record
    const { error: dbError } = await supabaseAdmin
      .from("whatsapp_instances_qr")
      .upsert({
        workspace_id,
        instance_key: instanceName,
        status: "connecting",
        qr_code: qrSrc,
      }, { onConflict: "workspace_id" });

    if (dbError) {
      console.error("[whatsapp-qr-create] DB error:", dbError);
    }

    return new Response(JSON.stringify({
      success: true,
      instance_key: instanceName,
      qr: qrSrc,
      debug_connect_response: connectData,
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
