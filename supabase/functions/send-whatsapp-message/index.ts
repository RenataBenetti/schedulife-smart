import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

  const token = authHeader.replace("Bearer ", "");
  const { data: authData, error: authError } = await authSupabase.auth.getClaims(token);
  if (authError || !authData?.claims) {
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

    // Buscar configuração WhatsApp do workspace
    const { data: waConfig, error: configErr } = await supabase
      .from("whatsapp_config")
      .select("*")
      .eq("workspace_id", workspace_id)
      .maybeSingle();

    if (configErr || !waConfig) {
      return new Response(JSON.stringify({ error: "WhatsApp não configurado para este workspace" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { evolution_api_url, evolution_api_key, evolution_instance } = waConfig as any;

    if (!evolution_api_url || !evolution_api_key || !evolution_instance) {
      return new Response(JSON.stringify({ error: "Configuração da Evolution API incompleta" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Formatar número de telefone: remover formatação e adicionar @s.whatsapp.net
    const cleanPhone = phone.replace(/\D/g, "");
    // Se não começa com código do país, adicionar 55 (Brasil)
    const fullPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
    const whatsappNumber = `${fullPhone}@s.whatsapp.net`;

    // Chamar Evolution API para enviar mensagem
    const apiUrl = evolution_api_url.replace(/\/$/, "");
    const evolutionRes = await fetch(`${apiUrl}/message/sendText/${evolution_instance}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": evolution_api_key,
      },
      body: JSON.stringify({
        number: whatsappNumber,
        text: message,
      }),
    });

    let evolutionData: any = {};
    let sendStatus = "sent";
    let errorMessage: string | null = null;

    if (!evolutionRes.ok) {
      sendStatus = "error";
      const errText = await evolutionRes.text();
      errorMessage = `Evolution API error ${evolutionRes.status}: ${errText}`;
      console.error("Evolution API error:", errorMessage);
    } else {
      evolutionData = await evolutionRes.json();
    }

    // Registrar na tabela message_logs
    const logRow: any = {
      workspace_id,
      phone: fullPhone,
      body: message,
      status: sendStatus,
    };
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

    return new Response(JSON.stringify({ success: true, data: evolutionData }), {
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
