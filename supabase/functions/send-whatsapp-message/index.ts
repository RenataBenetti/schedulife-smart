import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getUazApiConfigForToken, uazApiFetch } from "../_shared/uazapi.ts";

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

    const cleanPhone = phone.replace(/\D/g, "");
    const fullPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;

    const { data: qrInstance } = await supabase
      .from("whatsapp_instances_qr")
      .select("*")
      .eq("workspace_id", workspace_id)
      .eq("status", "connected")
      .maybeSingle();

    if (!qrInstance || !qrInstance.instance_key || !qrInstance.instance_token) {
      return new Response(JSON.stringify({ error: "WhatsApp não configurado para este workspace. Conecte via QR Code em Configurações → Integrações." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const config = getUazApiConfigForToken(qrInstance.instance_token);
    if (!config) {
      return new Response(JSON.stringify({ error: "Servidor de WhatsApp não configurado." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sendRes = await uazApiFetch(config, {
      method: "POST",
      authType: "instance",
      pathCandidates: ["/send/text"],
      body: { number: fullPhone, text: message },
    });

    const logRow: any = { workspace_id, phone: fullPhone, body: message, status: "sent" };
    if (appointment_id) logRow.appointment_id = appointment_id;
    if (client_id) logRow.client_id = client_id;
    if (template_id) logRow.template_id = template_id;
    if (rule_id) logRow.rule_id = rule_id;

    await supabase.from("message_logs").insert(logRow);

    return new Response(JSON.stringify({ success: true, data: sendRes.data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("send-whatsapp-message error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
