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

    // Get instance from DB
    const { data: instance } = await supabaseAdmin
      .from("whatsapp_instances_qr")
      .select("*")
      .eq("workspace_id", workspace_id)
      .maybeSingle();

    if (!instance || !instance.instance_key) {
      return new Response(JSON.stringify({ status: "disconnected", connected: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const UAZAPI_BASE_URL = Deno.env.get("UAZAPI_BASE_URL");
    const UAZAPI_INSTANCE_TOKEN = Deno.env.get("UAZAPI_INSTANCE_TOKEN");

    if (!UAZAPI_BASE_URL || !UAZAPI_INSTANCE_TOKEN) {
      return new Response(JSON.stringify({ status: instance.status, connected: instance.status === "connected" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const baseUrl = UAZAPI_BASE_URL.replace(/\/$/, "");
    const headers = { "token": UAZAPI_INSTANCE_TOKEN, "Content-Type": "application/json" };

    const res = await fetch(`${baseUrl}/instance/status`, { headers });
    const data = await res.json();
    const state = data?.status ?? data?.state ?? data?.instance?.state ?? "unknown";
    const connected = state === "connected" || state === "open";
    const newStatus = connected ? "connected" : "disconnected";

    // Extract phone number from status response
    const rawPhone = data?.phone ?? data?.me?.id ?? data?.owner ?? null;
    const phoneNumber = rawPhone ? rawPhone.replace(/@.*$/, "").replace(/\D/g, "") : null;
    const updatedPhone = phoneNumber || instance.phone_number;

    // Update DB if changed
    if (newStatus !== instance.status || (phoneNumber && phoneNumber !== instance.phone_number)) {
      await supabaseAdmin
        .from("whatsapp_instances_qr")
        .update({
          status: newStatus,
          qr_code: connected ? null : instance.qr_code,
          ...(phoneNumber ? { phone_number: phoneNumber } : {}),
        })
        .eq("id", instance.id);
    }

    return new Response(JSON.stringify({
      status: newStatus,
      connected,
      phone_number: updatedPhone,
      instance_key: instance.instance_key,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[whatsapp-qr-status] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
