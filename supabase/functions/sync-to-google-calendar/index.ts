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

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
  const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

  // Validate auth
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let body: { workspace_id: string; client_name: string; starts_at: string; ends_at: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { workspace_id, client_name, starts_at, ends_at } = body;
  if (!workspace_id || !client_name || !starts_at || !ends_at) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Fetch Google Calendar config
  const { data: config, error: configError } = await supabaseAdmin
    .from("google_calendar_config")
    .select("*")
    .eq("workspace_id", workspace_id)
    .eq("connected", true)
    .maybeSingle();

  if (configError || !config) {
    return new Response(JSON.stringify({ error: "Google Calendar not connected" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let accessToken = config.access_token;

  // Refresh token if expired or close to expiry
  const expiresAt = config.token_expires_at ? new Date(config.token_expires_at) : null;
  const now = new Date();
  const needsRefresh = !expiresAt || expiresAt.getTime() - now.getTime() < 5 * 60 * 1000;

  if (needsRefresh && config.refresh_token) {
    console.log("Token expired or expiring soon, refreshing...");
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: config.refresh_token,
        grant_type: "refresh_token",
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) {
      console.error("Token refresh failed:", tokenData);
      return new Response(JSON.stringify({ error: "Failed to refresh Google token. Please reconnect Google Calendar." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    accessToken = tokenData.access_token;
    const newExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

    await supabaseAdmin
      .from("google_calendar_config")
      .update({ access_token: accessToken, token_expires_at: newExpiresAt })
      .eq("id", config.id);
  }

  // Create event in Google Calendar
  const calendarId = config.calendar_id || "primary";
  const event = {
    summary: `Sessão – ${client_name}`,
    start: { dateTime: starts_at },
    end: { dateTime: ends_at },
  };

  const eventRes = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    }
  );

  const eventData = await eventRes.json();

  if (!eventRes.ok) {
    console.error("Google Calendar event creation failed:", eventData);
    return new Response(JSON.stringify({ error: eventData.error?.message || "Failed to create event" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ google_event_id: eventData.id }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
