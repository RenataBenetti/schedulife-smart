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

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const authSupabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: authError } = await authSupabase.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { workspace_id, phone, message, appointment_id, client_id, template_id, rule_id } = await req.json();

    if (!workspace_id || !phone || !message) {
      return new Response(JSON.stringify({ error: "workspace_id, phone e message são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Formatar número de telefone
    const cleanPhone = phone.replace(/\D/g, "");
    const fullPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;

    // Strategy 1: Try QR Code mode (whatsapp_instances_qr + UazAPI)
    const UAZAPI_BASE_URL = Deno.env.get("UAZAPI_BASE_URL");
    const UAZAPI_INSTANCE_TOKEN = Deno.env.get("UAZAPI_INSTANCE_TOKEN");

    const { data: qrInstance } = await supabase
      .from("whatsapp_instances_qr")
      .select("*")
      .eq("workspace_id", workspace_id)
      .eq("status", "connected")
      .maybeSingle();

    if (qrInstance && qrInstance.instance_key && UAZAPI_BASE_URL && UAZAPI_INSTANCE_TOKEN) {
      console.log("[send-whatsapp-message] Using QR Code mode via UazAPI");
      const baseUrl = UAZAPI_BASE_URL.replace(/\/$/, "");
      const abortSignal = AbortSignal.timeout(30000);
      const uazRes = await fetch(`${baseUrl}/message/sendText`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "token": UAZAPI_INSTANCE_TOKEN,
        },
        body: JSON.stringify({
          number: fullPhone,
          text: message,
        }),
        signal: abortSignal,
      });

      let uazData: any = {};
      let sendStatus = "sent";
      let errorMessage: string | null = null;

      if (!uazRes.ok) {
        sendStatus = "error";
        const errText = await uazRes.text();
        errorMessage = `UazAPI error ${uazRes.status}: ${errText}`;
        console.error("UazAPI error:", errorMessage);
      } else {
        uazData = await uazRes.json();
      }

      // Log
      const logRow: any = { workspace_id, phone: fullPhone, body: message, status: sendStatus };
      if (appointment_id) logRow.appointment_id = appointment_id;
      if (client_id) logRow.client_id = client_id;
      if (template_id) logRow.template_id = template_id;
      if (rule_id) logRow.rule_id = rule_id;
      if (errorMessage) logRow.error_message = errorMessage;
      await supabase.from("message_logs").insert(logRow);

      if (sendStatus === "error") {
        return new Response(JSON.stringify({ success: false, error: errorMessage }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, data: uazData }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // No connected instance found
    return new Response(JSON.stringify({ error: "WhatsApp não configurado para este workspace. Conecte via QR Code em Configurações → Integrações." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("send-whatsapp-message error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
