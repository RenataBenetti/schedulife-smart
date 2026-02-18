import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const url = new URL(req.url);

    // GET: load token data for the form
    if (req.method === "GET") {
      const token = url.searchParams.get("token");
      if (!token) {
        return new Response(JSON.stringify({ error: "Token inválido" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: tokenRecord, error: tokenError } = await supabase
        .from("client_registration_tokens")
        .select("id, client_id, workspace_id, expires_at, completed")
        .eq("token", token)
        .maybeSingle();

      if (tokenError || !tokenRecord) {
        return new Response(JSON.stringify({ error: "invalid" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (tokenRecord.completed) {
        return new Response(JSON.stringify({ error: "completed_already" }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (new Date(tokenRecord.expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: "expired" }), {
          status: 410,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch client data
      const { data: client } = await supabase
        .from("clients")
        .select("full_name, email, phone, cpf, rg, address_zip, address_street, address_number, address_complement, address_neighborhood, address_city, address_state")
        .eq("id", tokenRecord.client_id)
        .maybeSingle();

      return new Response(JSON.stringify({ client: client ?? {} }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST: save form data
    if (req.method === "POST") {
      const body = await req.json();
      const { token, ...formData } = body;

      if (!token || typeof token !== "string") {
        return new Response(JSON.stringify({ error: "Token inválido" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const allowedFields = [
        "full_name", "email", "phone", "cpf", "rg",
        "address_street", "address_number", "address_complement",
        "address_neighborhood", "address_city", "address_state", "address_zip",
      ];

      const updates: Record<string, string> = {};
      for (const field of allowedFields) {
        if (formData[field] !== undefined && formData[field] !== null) {
          const val = String(formData[field]).trim().slice(0, 500);
          if (val) updates[field] = val;
        }
      }

      const { data: tokenRecord, error: tokenError } = await supabase
        .from("client_registration_tokens")
        .select("id, client_id, workspace_id, expires_at, completed")
        .eq("token", token)
        .maybeSingle();

      if (tokenError || !tokenRecord) {
        return new Response(JSON.stringify({ error: "Link inválido ou expirado" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (tokenRecord.completed) {
        return new Response(JSON.stringify({ error: "Este link já foi utilizado" }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (new Date(tokenRecord.expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: "Este link expirou" }), {
          status: 410,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: updateError } = await supabase
        .from("clients")
        .update(updates)
        .eq("id", tokenRecord.client_id)
        .eq("workspace_id", tokenRecord.workspace_id);

      if (updateError) {
        console.error("Error updating client:", updateError);
        return new Response(JSON.stringify({ error: "Erro ao salvar dados" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabase
        .from("client_registration_tokens")
        .update({ completed: true })
        .eq("id", tokenRecord.id);

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Método não permitido" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
