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
    const { action, evolution_api_url, evolution_api_key, evolution_instance } = await req.json();

    if (!evolution_api_url || !evolution_api_key || !evolution_instance) {
      return new Response(JSON.stringify({ error: "evolution_api_url, evolution_api_key e evolution_instance são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const baseUrl = evolution_api_url.replace(/\/$/, "");
    const headers = { "apikey": evolution_api_key, "Content-Type": "application/json" };

    if (action === "check_connection") {
      // Verificar estado da conexão
      const res = await fetch(`${baseUrl}/instance/connectionState/${evolution_instance}`, { headers });
      const data = await res.json();
      const state = data?.instance?.state ?? data?.state ?? "unknown";
      const connected = state === "open";
      return new Response(JSON.stringify({ connected, state, raw: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get_qr") {
      // Buscar QR Code da instância
      // Primeiro tenta /instance/connect/{instance}
      const res = await fetch(`${baseUrl}/instance/connect/${evolution_instance}`, { headers });

      if (!res.ok) {
        const errText = await res.text();
        return new Response(JSON.stringify({ error: `Evolution API error ${res.status}: ${errText}` }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await res.json();
      // Evolution API v1 retorna base64 diretamente, v2 pode retornar qrcode.base64
      const qrBase64 = data?.base64 ?? data?.qrcode?.base64 ?? data?.qrCode ?? null;

      if (!qrBase64) {
        // Tenta endpoint alternativo /instance/qrcode/{instance}
        const res2 = await fetch(`${baseUrl}/instance/qrcode/${evolution_instance}`, { headers });
        if (res2.ok) {
          const data2 = await res2.json();
          const qr2 = data2?.base64 ?? data2?.qrcode?.base64 ?? null;
          if (qr2) {
            const qrSrc = qr2.startsWith("data:") ? qr2 : `data:image/png;base64,${qr2}`;
            return new Response(JSON.stringify({ qr: qrSrc }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
        return new Response(JSON.stringify({ error: "QR Code não encontrado na resposta da Evolution API", raw: data }), {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const qrSrc = qrBase64.startsWith("data:") ? qrBase64 : `data:image/png;base64,${qrBase64}`;
      return new Response(JSON.stringify({ qr: qrSrc }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: `Ação desconhecida: ${action}` }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("whatsapp-evolution-proxy error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
