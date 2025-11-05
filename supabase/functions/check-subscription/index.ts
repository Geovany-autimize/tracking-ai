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
      .select("stripe_subscription_id, current_period_start, current_period_end")
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
      
      // Convert subscription dates from Stripe (if available)
      if (subscription.current_period_start) {
        subscriptionStart = new Date(subscription.current_period_start * 1000).toISOString();
      }
      if (subscription.current_period_end) {
        subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      }
      
      // If Stripe doesn't provide dates, use DB fallback
      if (!subscriptionStart || !subscriptionEnd) {
        subscriptionStart = subscriptionStart || dbSub?.current_period_start;
        subscriptionEnd = subscriptionEnd || dbSub?.current_period_end;
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
        const updatePayload: any = {
          current_period_start: subscriptionStart || null,
          current_period_end: subscriptionEnd || null,
          cancel_at_period_end: cancelAtPeriodEnd,
          stripe_subscription_id: stripeSubscriptionId || dbSub?.stripe_subscription_id || null,
          status: 'active',
          plan_id: planId,
        };
        const { error: upErr } = await supabaseClient
          .from("subscriptions")
          .update(updatePayload)
          .eq("customer_id", sessionData.customer_id)
          .eq("status", "active");
        if (upErr) {
          logStep("Failed to persist subscription dates", { error: upErr.message });
        } else {
          logStep("Persisted subscription dates to DB", { start: updatePayload.current_period_start, end: updatePayload.current_period_end });
        }
      }
    } catch (e) {
      logStep("Error while persisting subscription dates", { error: e instanceof Error ? e.message : String(e) });
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
