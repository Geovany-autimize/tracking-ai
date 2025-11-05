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
    logStep("Starting population of stripe_subscription_id");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Get all active subscriptions (with or without stripe_subscription_id)
    const { data: subscriptions, error: subError } = await supabaseClient
      .from("subscriptions")
      .select("id, customer_id, plan_id, current_period_start, current_period_end, stripe_subscription_id")
      .eq("status", "active");

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

        // ALWAYS update dates from Stripe (timestamps are in seconds)
        if (matchedSub.current_period_start) {
          updatePayload.current_period_start = new Date(matchedSub.current_period_start * 1000).toISOString();
          logStep("Updating start date", {
            supabaseId: sub.id,
            stripeTimestamp: matchedSub.current_period_start,
            isoDate: updatePayload.current_period_start
          });
        }
        if (matchedSub.current_period_end) {
          updatePayload.current_period_end = new Date(matchedSub.current_period_end * 1000).toISOString();
          logStep("Updating end date", {
            supabaseId: sub.id,
            stripeTimestamp: matchedSub.current_period_end,
            isoDate: updatePayload.current_period_end
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
