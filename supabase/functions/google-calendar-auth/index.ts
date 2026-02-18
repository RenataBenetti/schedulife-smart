import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
  const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
  const REDIRECT_URI = `${SUPABASE_URL}/functions/v1/google-calendar-auth`;

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state"); // workspace_id

  // If no code, this is the initial request to get the auth URL
  if (!code) {
    try {
      const body = await req.json();
      const workspaceId = body.workspace_id;
      if (!workspaceId) {
        return new Response(JSON.stringify({ error: "workspace_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const scopes = [
        "https://www.googleapis.com/auth/calendar.events",
      ];

      const authUrl =
        `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}` +
        `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
        `&response_type=code` +
        `&scope=${encodeURIComponent(scopes.join(" "))}` +
        `&access_type=offline` +
        `&prompt=consent` +
        `&state=${encodeURIComponent(workspaceId)}`;

      return new Response(JSON.stringify({ auth_url: authUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // If code is present, this is the callback from Google
  const workspaceId = state;
  if (!workspaceId) {
    return new Response("Missing state (workspace_id)", { status: 400 });
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok) {
      console.error("Token exchange error:", tokenData);
      return new Response(`Error exchanging code: ${tokenData.error_description || tokenData.error}`, { status: 400 });
    }

    const { access_token, refresh_token, expires_in } = tokenData;
    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

    // Save tokens to database
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: existing } = await supabase
      .from("google_calendar_config")
      .select("id")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (existing) {
      await supabase.from("google_calendar_config").update({
        access_token,
        refresh_token: refresh_token || undefined,
        token_expires_at: expiresAt,
        connected: true,
      }).eq("id", existing.id);
    } else {
      await supabase.from("google_calendar_config").insert({
        workspace_id: workspaceId,
        access_token,
        refresh_token,
        token_expires_at: expiresAt,
        connected: true,
      });
    }

    // Redirect user back to the app
    const appUrl = Deno.env.get("APP_URL") || "https://schedulife-smart.lovable.app";
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${appUrl}/auth/google-calendar/callback?success=true`,
      },
    });
  } catch (err) {
    console.error("Google Calendar auth error:", err);
    return new Response(`Internal error: ${err.message}`, { status: 500 });
  }
});
