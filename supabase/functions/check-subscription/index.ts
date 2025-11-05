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
    
    logStep("Subscriptions query result", { count: subscriptions.data.length });
    
    const hasActiveSub = subscriptions.data.length > 0;
    let planId = 'free';
    let subscriptionEnd = null;
    let subscriptionStart = null;
    let cancelAtPeriodEnd = false;
    
    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      cancelAtPeriodEnd = subscription.cancel_at_period_end || false;
      logStep("Subscription details", { 
        subscriptionId: subscription.id, 
        status: subscription.status,
        currentPeriodStart: subscription.current_period_start,
        currentPeriodEnd: subscription.current_period_end,
        priceId: subscription.items.data[0]?.price?.id,
        cancelAtPeriodEnd 
      });
      
      // Convert subscription dates directly from Stripe (no fallbacks)
      if (subscription.current_period_start) {
        subscriptionStart = new Date(subscription.current_period_start * 1000).toISOString();
      }
      if (subscription.current_period_end) {
        subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      }
      logStep("Subscription dates from Stripe", { start: subscriptionStart, end: subscriptionEnd });
      
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
