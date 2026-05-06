import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getUazApiConfigForToken, uazApiFetch } from "../_shared/uazapi.ts";

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
    const { workspace_id, to_phone, message } = await req.json();
    if (!workspace_id || !to_phone) {
      return new Response(JSON.stringify({ error: "workspace_id e to_phone são obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: instance } = await supabaseAdmin
      .from("whatsapp_instances_qr")
      .select("*")
      .eq("workspace_id", workspace_id)
      .maybeSingle();

    if (!instance || instance.status !== "connected" || !instance.instance_token) {
      return new Response(JSON.stringify({ error: "WhatsApp QR não está conectado" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const config = getUazApiConfigForToken(instance.instance_token);
    if (!config) {
      return new Response(JSON.stringify({ error: "Servidor QR não configurado" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanPhone = to_phone.replace(/\D/g, "");
    const phone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
    const textMessage = message || "Agendix: conexão QR realizada com sucesso ✅";

    const sendRes = await uazApiFetch(config, {
      method: "POST",
      pathCandidates: ["/send/text"],
      body: { number: phone, text: textMessage },
    });

    return new Response(JSON.stringify({ success: true, data: sendRes.data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[whatsapp-qr-send] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
