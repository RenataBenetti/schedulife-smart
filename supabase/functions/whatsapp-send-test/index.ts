import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Normalizar telefone para E.164
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) return `+${digits}`;
  if (digits.length === 11 || digits.length === 10) return `+55${digits}`;
  if (digits.startsWith("+")) return digits;
  return `+${digits}`;
}

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

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { to_phone, workspace_id } = body;

    if (!to_phone || !workspace_id) {
      return new Response(JSON.stringify({ error: "to_phone e workspace_id são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validar membro do workspace
    const { data: membership } = await supabaseClient
      .from("workspace_members")
      .select("workspace_id")
      .eq("workspace_id", workspace_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      return new Response(JSON.stringify({ error: "Acesso negado a este workspace" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Buscar credenciais via service role (nunca expostas ao frontend)
    const { data: connection, error: connError } = await supabaseAdmin
      .from("whatsapp_connections")
      .select("access_token_encrypted, phone_number_id, status, waba_id")
      .eq("workspace_id", workspace_id)
      .maybeSingle();

    if (connError || !connection) {
      return new Response(JSON.stringify({ error: "WhatsApp não configurado para este workspace" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (connection.status !== "connected") {
      return new Response(JSON.stringify({ error: "WhatsApp não está conectado. Reconecte primeiro." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!connection.phone_number_id || !connection.access_token_encrypted) {
      return new Response(JSON.stringify({ error: "Credenciais incompletas. Reconecte o WhatsApp." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedPhone = normalizePhone(to_phone);
    const META_GRAPH_VERSION = Deno.env.get("META_GRAPH_VERSION") || "v20.0";

    // Enviar mensagem de texto simples (dentro de janela de conversa) ou template
    // Para teste de conectividade, enviamos uma mensagem de texto simples
    const messagePayload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: normalizedPhone,
      type: "text",
      text: {
        preview_url: false,
        body: "✅ Agendix: sua conexão com o WhatsApp foi realizada com sucesso! Este é um teste de conectividade.",
      },
    };

    const sendUrl = `https://graph.facebook.com/${META_GRAPH_VERSION}/${connection.phone_number_id}/messages`;
    const sendRes = await fetch(sendUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${connection.access_token_encrypted}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messagePayload),
    });

    const sendData = await sendRes.json();
    const providerMessageId = sendData?.messages?.[0]?.id || null;
    const sendError = sendData?.error?.message || null;
    const status = sendRes.ok && !sendError ? "sent" : "failed";

    // Registrar log (sem expor token)
    await supabaseAdmin.from("whatsapp_message_logs").insert({
      workspace_id,
      to_phone: normalizedPhone,
      message_type: "text",
      template_name: null,
      status,
      provider_message_id: providerMessageId,
      error: sendError,
    });

    if (!sendRes.ok || sendError) {
      // Tratar erros comuns da Meta de forma amigável
      let friendlyError = sendError || "Erro ao enviar mensagem";
      if (sendError?.includes("not a valid whatsapp number")) {
        friendlyError = "Número inválido ou não tem WhatsApp. Verifique o número com código do país (ex: 5511999999999).";
      } else if (sendError?.includes("Invalid OAuth access token")) {
        friendlyError = "Token expirado. Reconecte o WhatsApp com Facebook.";
        // Atualizar status para error
        await supabaseAdmin.from("whatsapp_connections").update({
          status: "error",
          last_error: "Token expirado",
        }).eq("workspace_id", workspace_id);
      } else if (sendError?.includes("outside of the allowed window")) {
        friendlyError = "Número fora da janela de 24h. Para enviar mensagens a usuários que não iniciaram conversa, você precisa de um template aprovado.";
      }

      return new Response(JSON.stringify({ error: friendlyError }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      status: "sent",
      provider_message_id: providerMessageId,
      to: normalizedPhone,
      message: "Mensagem de teste enviada com sucesso!",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("whatsapp-send-test error:", err.message);
    return new Response(JSON.stringify({ error: "Erro interno. Tente novamente." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
