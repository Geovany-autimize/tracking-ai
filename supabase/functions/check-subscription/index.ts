import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-session-token",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    const sessionToken = req.headers.get("x-session-token");
    const token = sessionToken || (authHeader ? authHeader.replace("Bearer ", "") : null);
    
    if (!token) throw new Error("No session token provided");
    logStep("Token received", { tokenLength: token.length });
    
    // Get customer from session
    const { data: sessionData, error: sessionError } = await supabaseClient
      .from("sessions")
      .select("customer_id")
      .eq("token_jti", token)
      .gt("expires_at", new Date().toISOString())
      .single();
    
    if (sessionError || !sessionData) {
      logStep("Session not found or expired", { error: sessionError?.message });
      throw new Error("Session not found or expired");
    }
    
    logStep("Session found", { customerId: sessionData.customer_id });
    
    // Get customer email
    const { data: customerData, error: customerError } = await supabaseClient
      .from("customers")
      .select("email")
      .eq("id", sessionData.customer_id)
      .single();
    
    if (customerError || !customerData?.email) {
      logStep("Customer not found", { error: customerError?.message });
      throw new Error("Customer not found");
    }
    
    const userEmail = customerData.email;
    logStep("Customer authenticated", { customerId: sessionData.customer_id, email: userEmail });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    // Check if we have stripe_subscription_id in DB
    const { data: dbSub } = await supabaseClient
      .from("subscriptions")
      .select("id, stripe_subscription_id, current_period_start, current_period_end")
      .eq("customer_id", sessionData.customer_id)
      .eq("status", "active")
      .maybeSingle();
    
    let subscription = null;
    
    // PRIORITY: Use stripe_subscription_id if available (1 API call)
    if (dbSub?.stripe_subscription_id) {
      try {
        subscription = await stripe.subscriptions.retrieve(dbSub.stripe_subscription_id);
        logStep("Retrieved subscription by ID", { subscriptionId: subscription.id });
      } catch (err) {
        logStep("Subscription ID not found in Stripe, falling back to email lookup");
      }
    }
    
    // FALLBACK: Use email lookup (3 API calls)
    if (!subscription) {
      const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
      
      if (customers.data.length === 0) {
        logStep("No customer found, returning free plan");
        return new Response(JSON.stringify({ 
          subscribed: false,
          plan_id: 'free'
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      const customerId = customers.data[0].id;
      logStep("Found Stripe customer", { customerId });

      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 1,
      });

      if (subscriptions.data.length > 0) {
        subscription = subscriptions.data[0];
      }
    }

    const hasActiveSub = !!subscription;
    let planId = 'free';
    let subscriptionEnd = null;
    let subscriptionStart = null;
    let cancelAtPeriodEnd = false;
    let stripeSubscriptionId = null;
    
    if (hasActiveSub && subscription) {
      cancelAtPeriodEnd = subscription.cancel_at_period_end || false;
      stripeSubscriptionId = subscription.id;
      logStep("Found active subscription", { 
        subscriptionId: subscription.id,
        cancelAtPeriodEnd 
      });
      
      // Extract from subscription item when available (Stripe 2025 API may not include top-level period fields)
      const item: any = (subscription.items?.data?.[0] as any) || null;
      const startTs: number | null =
        (item?.current_period_start as number | undefined) ??
        (subscription.current_period_start as number | undefined) ??
        (subscription.start_date as number | undefined) ??
        null;
      const endTs: number | null =
        (item?.current_period_end as number | undefined) ??
        (subscription.current_period_end as number | undefined) ??
        null;
      const formatPgTs = (ts: number | null) => ts ? new Date(ts * 1000).toISOString().replace(/\.\d{3}Z$/, '+00:00') : null;
      subscriptionStart = formatPgTs(startTs);
      subscriptionEnd = formatPgTs(endTs);
      
      // If still missing, use DB fallback
      if (!subscriptionStart || !subscriptionEnd) {
        subscriptionStart = subscriptionStart || dbSub?.current_period_start || null;
        subscriptionEnd = subscriptionEnd || dbSub?.current_period_end || null;
        logStep("Using DB dates as fallback", { start: subscriptionStart, end: subscriptionEnd });
      }
      
      logStep("Subscription dates", { start: subscriptionStart, end: subscriptionEnd });
      
      const priceId = subscription.items.data[0]?.price?.id;
      // Mapeia price_id para plan_id
      if (priceId === 'price_1SMEgFFsSB8n8Az0aSBb70E7') {
        planId = 'premium';
      } else {
        planId = 'enterprise';
      }
      logStep("Determined plan", { planId, priceId });
    } else {
      logStep("No active subscription found");
    }

    // Persist Stripe dates in DB when available
    try {
      if (hasActiveSub) {
        // CASE 1: No active subscription in DB but exists in Stripe → CREATE
        if (!dbSub) {
          logStep("No active subscription in DB, creating new from Stripe", {
            stripe_subscription_id: stripeSubscriptionId,
            customer_id: sessionData.customer_id
          });

          await supabaseClient
            .from("subscriptions")
            .insert({
              customer_id: sessionData.customer_id,
              plan_id: planId,
              status: 'active',
              stripe_subscription_id: stripeSubscriptionId,
              current_period_start: subscriptionStart,
              current_period_end: subscriptionEnd,
              cancel_at_period_end: cancelAtPeriodEnd
            });

          logStep("New subscription created from Stripe");
        }
        // CASE 2: Subscription exists in DB AND stripe_subscription_id changed → CANCEL old + CREATE new
        else if (dbSub.stripe_subscription_id && stripeSubscriptionId && dbSub.stripe_subscription_id !== stripeSubscriptionId) {
          logStep("Stripe subscription ID changed - marking old as canceled and creating new", {
            old_stripe_id: dbSub.stripe_subscription_id,
            new_stripe_id: stripeSubscriptionId,
            customer_id: sessionData.customer_id
          });

          // Mark old subscription as canceled
          await supabaseClient
            .from("subscriptions")
            .update({
              status: 'canceled',
              canceled_at: new Date().toISOString()
            })
            .eq("id", dbSub.id);

          // Create new subscription
          await supabaseClient
            .from("subscriptions")
            .insert({
              customer_id: sessionData.customer_id,
              plan_id: planId,
              status: 'active',
              stripe_subscription_id: stripeSubscriptionId,
              current_period_start: subscriptionStart,
              current_period_end: subscriptionEnd,
              cancel_at_period_end: cancelAtPeriodEnd
            });

          logStep("Old subscription canceled, new subscription created");
        }
        // CASE 3: Same subscription → UPDATE
        else {
          logStep("Updating existing subscription", {
            stripe_subscription_id: stripeSubscriptionId,
            customer_id: sessionData.customer_id
          });

          const updatePayload: any = {
            cancel_at_period_end: cancelAtPeriodEnd,
            stripe_subscription_id: stripeSubscriptionId || dbSub?.stripe_subscription_id || null,
            status: 'active',
            plan_id: planId,
          };
          
          // Only update dates if we have valid values from Stripe (don't overwrite with null)
          if (subscriptionStart) {
            updatePayload.current_period_start = subscriptionStart;
          }
          if (subscriptionEnd) {
            updatePayload.current_period_end = subscriptionEnd;
          }
          
          const { error: upErr } = await supabaseClient
            .from("subscriptions")
            .update(updatePayload)
            .eq("customer_id", sessionData.customer_id)
            .eq("status", "active");
          if (upErr) {
            logStep("Failed to update subscription", { error: upErr.message });
          } else {
            logStep("Subscription updated successfully", { 
              updatedStart: subscriptionStart ? "yes" : "no",
              updatedEnd: subscriptionEnd ? "yes" : "no"
            });
          }
        }
      }
    } catch (e) {
      logStep("Error while persisting subscription", { error: e instanceof Error ? e.message : String(e) });
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      plan_id: planId,
      subscription_start: subscriptionStart,
      subscription_end: subscriptionEnd,
      cancel_at_period_end: cancelAtPeriodEnd
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
