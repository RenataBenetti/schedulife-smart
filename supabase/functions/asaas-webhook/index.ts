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
    const body = await req.json();
    console.log("Asaas webhook received:", JSON.stringify(body));

    const event: string = body.event ?? "";
    const payment = body.payment ?? {};

    // Identify email of the payer
    const customerEmail: string = payment?.customer?.email ?? payment?.billingType ? undefined : body.payment?.customer?.email;
    const email: string | undefined = payment?.externalReference ?? payment?.customer?.email ?? undefined;

    // Determine plan_type by value (3990 = annual R$39,90 / 4990 = monthly R$49,90)
    const valueInCents: number = Math.round((payment?.value ?? 0) * 100);
    let plan_type = "monthly";
    if (valueInCents <= 3990) {
      plan_type = "annual";
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find workspace by customer email stored in subscription or auth
    let workspace_id: string | null = null;

    // Try to find user by email in auth, then get workspace
    if (email) {
      const { data: users } = await supabase.auth.admin.listUsers();
      const matchedUser = users?.users?.find((u: any) => u.email === email);
      if (matchedUser) {
        const { data: member } = await supabase
          .from("workspace_members")
          .select("workspace_id")
          .eq("user_id", matchedUser.id)
          .limit(1)
          .maybeSingle();
        workspace_id = member?.workspace_id ?? null;
      }
    }

    // Fallback: try externalReference as workspace_id directly
    if (!workspace_id && payment?.externalReference && payment.externalReference.match(/^[0-9a-f-]{36}$/)) {
      workspace_id = payment.externalReference;
    }

    if (!workspace_id) {
      console.warn("Could not identify workspace for event:", event, "email:", email);
      return new Response(JSON.stringify({ received: true, warning: "workspace not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Map event to subscription update
    let updateData: Record<string, any> = {};

    if (event === "PAYMENT_RECEIVED" || event === "SUBSCRIPTION_CREATED") {
      updateData = {
        status: "active",
        plan_type,
        current_period_start: payment?.dateCreated ?? new Date().toISOString(),
        current_period_end: payment?.dueDate ?? null,
        external_subscription_id: payment?.subscription ?? payment?.id ?? null,
      };
    } else if (event === "PAYMENT_OVERDUE") {
      updateData = { status: "overdue" };
    } else if (event === "SUBSCRIPTION_INACTIVATED" || event === "SUBSCRIPTION_DELETED") {
      updateData = { status: "canceled" };
    } else {
      console.log("Ignoring event:", event);
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error } = await supabase
      .from("subscription_status")
      .update(updateData)
      .eq("workspace_id", workspace_id);

    if (error) {
      console.error("Error updating subscription:", error);
      throw error;
    }

    console.log("Subscription updated for workspace:", workspace_id, updateData);
    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
