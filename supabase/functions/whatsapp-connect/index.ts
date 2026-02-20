import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    const { code, workspace_id } = body;

    if (!code || !workspace_id) {
      return new Response(JSON.stringify({ error: "code e workspace_id são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validar que o usuário é membro do workspace
    const { data: membership, error: memberError } = await supabaseClient
      .from("workspace_members")
      .select("workspace_id")
      .eq("workspace_id", workspace_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (memberError || !membership) {
      return new Response(JSON.stringify({ error: "Acesso negado a este workspace" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const META_APP_ID = Deno.env.get("META_APP_ID");
    const META_APP_SECRET = Deno.env.get("META_APP_SECRET");
    const META_GRAPH_VERSION = Deno.env.get("META_GRAPH_VERSION") || "v20.0";
    const META_REDIRECT_URI = Deno.env.get("META_REDIRECT_URI");

    // --- Validação estruturada de configuração ---
    const missing: string[] = [];
    if (!META_APP_ID) missing.push("META_APP_ID");
    if (!META_APP_SECRET) missing.push("META_APP_SECRET");
    if (!META_GRAPH_VERSION) missing.push("META_GRAPH_VERSION");

    console.log("[whatsapp-connect] Config check:", JSON.stringify({
      app_id_used: META_APP_ID || "(not set)",
      app_id_expected: "960475733312726",
      app_id_matches: META_APP_ID === "960475733312726",
      secret_defined: !!META_APP_SECRET,
      redirect_uri: META_REDIRECT_URI || "(not set)",
      graph_version: META_GRAPH_VERSION,
    }));

    if (missing.length > 0) {
      console.error("[whatsapp-connect] META_CONFIG_INVALID, missing:", missing);
      return new Response(JSON.stringify({ error: "META_CONFIG_INVALID", missing }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (META_APP_ID !== "960475733312726") {
      console.error("[whatsapp-connect] META_APP_ID mismatch:", META_APP_ID);
      return new Response(JSON.stringify({
        error: "META_CONFIG_INVALID",
        detail: "META_APP_ID não corresponde ao esperado (960475733312726)",
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Trocar code por access token
    const tokenParams = new URLSearchParams({
      client_id: META_APP_ID,
      client_secret: META_APP_SECRET!,
      code,
    });
    if (META_REDIRECT_URI) {
      tokenParams.set("redirect_uri", META_REDIRECT_URI);
    }

    const tokenUrl = `https://graph.facebook.com/${META_GRAPH_VERSION}/oauth/access_token?${tokenParams.toString()}`;
    console.log("[whatsapp-connect] Token exchange URL (sem secret):", tokenUrl.replace(META_APP_SECRET!, "***"));

    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || tokenData.error) {
      const errMsg = tokenData.error?.message || "Erro ao trocar code por token";
      console.error("[whatsapp-connect] Token exchange error:", errMsg, JSON.stringify(tokenData.error || {}));

      await supabaseAdmin.from("whatsapp_connections").upsert({
        workspace_id,
        created_by: user.id,
        status: "error",
        last_error: errMsg,
        updated_at: new Date().toISOString(),
      }, { onConflict: "workspace_id" });

      return new Response(JSON.stringify({ error: errMsg }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken: string = tokenData.access_token;

    // Buscar WABA e phone_number_id vinculados ao token
    const debugUrl = `https://graph.facebook.com/${META_GRAPH_VERSION}/debug_token?input_token=${accessToken}&access_token=${META_APP_ID}|${META_APP_SECRET}`;
    const debugRes = await fetch(debugUrl);
    const debugData = await debugRes.json();

    // Buscar as contas de negócio do WhatsApp vinculadas
    const wabaListUrl = `https://graph.facebook.com/${META_GRAPH_VERSION}/me/businesses?access_token=${accessToken}&fields=id,name,whatsapp_business_accounts`;
    const wabaListRes = await fetch(wabaListUrl);
    const wabaListData = await wabaListRes.json();

    let waba_id: string | null = null;
    let phone_number_id: string | null = null;
    let phone_display: string | null = null;

    // Tentar extrair WABA e número de telefone
    if (wabaListData.data && wabaListData.data.length > 0) {
      for (const business of wabaListData.data) {
        if (business.whatsapp_business_accounts?.data?.length > 0) {
          const waba = business.whatsapp_business_accounts.data[0];
          waba_id = waba.id;

          // Buscar números de telefone da WABA
          const phonesUrl = `https://graph.facebook.com/${META_GRAPH_VERSION}/${waba_id}/phone_numbers?access_token=${accessToken}&fields=id,display_phone_number,verified_name`;
          const phonesRes = await fetch(phonesUrl);
          const phonesData = await phonesRes.json();

          if (phonesData.data && phonesData.data.length > 0) {
            phone_number_id = phonesData.data[0].id;
            phone_display = phonesData.data[0].display_phone_number;
          }
          break;
        }
      }
    }

    // Calcular expiração do token (padrão 60 dias se long-lived)
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 60);

    // Persistir no banco com service role (acesso ao token criptografado)
    // NUNCA expor o token no response
    const { error: upsertError } = await supabaseAdmin.from("whatsapp_connections").upsert({
      workspace_id,
      created_by: user.id,
      waba_id,
      phone_number_id,
      phone_display,
      access_token_encrypted: accessToken,
      token_expires_at: tokenExpiresAt.toISOString(),
      status: phone_number_id ? "connected" : "disconnected",
      last_error: phone_number_id ? null : "Nenhum número de telefone encontrado na conta",
      updated_at: new Date().toISOString(),
    }, { onConflict: "workspace_id" });

    if (upsertError) {
      console.error("Upsert error:", upsertError.message);
      return new Response(JSON.stringify({ error: "Erro ao salvar configuração" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Retornar apenas dados não sensíveis
    return new Response(JSON.stringify({
      status: phone_number_id ? "connected" : "disconnected",
      waba_id,
      phone_number_id,
      phone_display,
      message: phone_number_id
        ? `WhatsApp conectado! Número: ${phone_display}`
        : "Conta conectada, mas nenhum número encontrado. Verifique sua conta WhatsApp Business.",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("whatsapp-connect error:", err.message);
    return new Response(JSON.stringify({ error: "Erro interno. Tente novamente." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
