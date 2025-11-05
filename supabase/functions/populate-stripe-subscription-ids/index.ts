import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-session-token",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[POPULATE-STRIPE-IDS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Starting population of stripe_subscription_id for authenticated user");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Extract and validate session token
    const sessionToken = req.headers.get("x-session-token") || req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!sessionToken) {
      logStep("ERROR: No session token provided");
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // Get customer_id from session
    const { data: sessionData, error: sessionError } = await supabaseClient
      .from("sessions")
      .select("customer_id, expires_at")
      .eq("token_jti", sessionToken)
      .single();

    if (sessionError || !sessionData) {
      logStep("ERROR: Invalid session token", { error: sessionError?.message });
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    if (new Date(sessionData.expires_at) < new Date()) {
      logStep("ERROR: Session expired");
      return new Response(JSON.stringify({ error: "Session expired" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const customerId = sessionData.customer_id;
    logStep("Authenticated user", { customer_id: customerId });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Get only this user's active subscriptions
    const { data: subscriptions, error: subError } = await supabaseClient
      .from("subscriptions")
      .select("id, customer_id, plan_id, current_period_start, current_period_end, stripe_subscription_id")
      .eq("status", "active")
      .eq("customer_id", customerId);

    if (subError) throw subError;

    logStep("Found subscriptions to process", { count: subscriptions?.length || 0 });

    const results = {
      total: subscriptions?.length || 0,
      updated: 0,
      skipped: 0,
      errors: [] as any[],
    };

    for (const sub of subscriptions || []) {
      try {
        let matchedSub = null;

        // PRIORITY: If we already have stripe_subscription_id, use it directly (1 API call)
        if (sub.stripe_subscription_id) {
          try {
            matchedSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
            logStep("Retrieved subscription by ID", { 
              subscriptionId: matchedSub.id,
              supabaseId: sub.id 
            });
          } catch (err) {
            logStep("Subscription ID not found in Stripe, falling back to email lookup", {
              subscriptionId: sub.stripe_subscription_id
            });
          }
        }

        // FALLBACK: Use email lookup if no stripe_subscription_id or not found (3 API calls)
        if (!matchedSub) {
          // Get customer email
          const { data: customer } = await supabaseClient
            .from("customers")
            .select("email")
            .eq("id", sub.customer_id)
            .single();

          if (!customer?.email) {
            results.skipped++;
            logStep("No email for customer", { customerId: sub.customer_id });
            continue;
          }

          // Find Stripe customer
          const stripeCustomers = await stripe.customers.list({
            email: customer.email,
            limit: 1,
          });

          if (stripeCustomers.data.length === 0) {
            results.skipped++;
            logStep("No Stripe customer found", { email: customer.email });
            continue;
          }

          // Find active subscription
          const stripeSubs = await stripe.subscriptions.list({
            customer: stripeCustomers.data[0].id,
            status: "active",
            limit: 10,
          });

          // Match by plan_id (price_id mapping)
          for (const stripeSub of stripeSubs.data) {
            const priceId = stripeSub.items.data[0]?.price?.id;
            let planId = 'free';
            
            if (priceId === 'price_1SMEgFFsSB8n8Az0aSBb70E7') planId = 'premium';
            else if (priceId) planId = 'enterprise';

            if (planId === sub.plan_id) {
              matchedSub = stripeSub;
              break;
            }
          }

          if (!matchedSub) {
            results.skipped++;
            logStep("No matching Stripe subscription", { 
              planId: sub.plan_id, 
              email: customer.email 
            });
            continue;
          }
        }

        // Build update payload with stripe_subscription_id and dates
        const updatePayload: any = {
          stripe_subscription_id: matchedSub.id,
        };

        // Extract period timestamps prioritizing subscription item fields
        const item: any = (matchedSub.items?.data?.[0] as any) || null;
        const startTs: number | null =
          (item?.current_period_start as number | undefined) ??
          (matchedSub.current_period_start as number | undefined) ??
          (matchedSub.start_date as number | undefined) ??
          null;
        const endTs: number | null =
          (item?.current_period_end as number | undefined) ??
          (matchedSub.current_period_end as number | undefined) ??
          null;
        const formatPgTs = (ts: number | null) => ts ? new Date(ts * 1000).toISOString().replace(/\.\d{3}Z$/, '+00:00') : null;

        const startIso = formatPgTs(startTs);
        const endIso = formatPgTs(endTs);

        if (startIso) {
          updatePayload.current_period_start = startIso;
          logStep("Updating start date", {
            supabaseId: sub.id,
            stripeTimestamp: startTs,
            isoDate: startIso
          });
        }
        if (endIso) {
          updatePayload.current_period_end = endIso;
          logStep("Updating end date", {
            supabaseId: sub.id,
            stripeTimestamp: endTs,
            isoDate: endIso
          });
        }

        const { error: updateError } = await supabaseClient
          .from("subscriptions")
          .update(updatePayload)
          .eq("id", sub.id);

        if (updateError) throw updateError;

        results.updated++;
        logStep("Updated subscription", { 
          supabaseId: sub.id, 
          stripeId: matchedSub.id,
          updatedFields: Object.keys(updatePayload)
        });

      } catch (error) {
        results.errors.push({
          subscriptionId: sub.id,
          customerId: sub.customer_id,
          error: error instanceof Error ? error.message : String(error),
        });
        logStep("ERROR processing subscription", { 
          subscriptionId: sub.id, 
          error 
        });
      }
    }

    logStep("Population completed", results);

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in populate function", { error: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
