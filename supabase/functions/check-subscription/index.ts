import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.0.0?target=deno";
import { createClient } from "@supabase/supabase-js";

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

    // Get customer ID from session token
    const token = req.headers.get("x-session-token");
    if (!token) throw new Error("No session token provided");
    
    const { data: sessionData, error: sessionError } = await supabaseClient
      .from('sessions')
      .select('customer_id')
      .eq('token_jti', token)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (sessionError || !sessionData) throw new Error("Invalid or expired session");
    
    const customerId = sessionData.customer_id;
    logStep("Session validated", { customerId });

    // Get customer email
    const { data: customerData, error: customerError } = await supabaseClient
      .from('customers')
      .select('email, stripe_customer_id')
      .eq('id', customerId)
      .single();

    if (customerError || !customerData) throw new Error("Customer not found");
    logStep("Customer found", { email: customerData.email });

    const stripe = new Stripe(stripeKey, { 
      apiVersion: "2024-11-20.acacia",
    });

    // Find Stripe customer
    let stripeCustomerId = customerData.stripe_customer_id;
    
    if (!stripeCustomerId) {
      const customers = await stripe.customers.list({ email: customerData.email, limit: 1 });
      if (customers.data.length === 0) {
        logStep("No Stripe customer found");
        return new Response(JSON.stringify({ subscribed: false }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
      stripeCustomerId = customers.data[0].id;
      logStep("Stripe customer found", { stripeCustomerId });
    }

    // Check for active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: "active",
      limit: 1,
    });

    const hasActiveSub = subscriptions.data.length > 0;
    let productId = null;
    let subscriptionEnd = null;
    let stripeSubscriptionId = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      productId = subscription.items.data[0].price.product;
      stripeSubscriptionId = subscription.id;
      logStep("Active subscription found", { 
        subscriptionId: subscription.id, 
        productId,
        endDate: subscriptionEnd 
      });

      // Update subscription in database
      const { error: subError } = await supabaseClient
        .from('subscriptions')
        .upsert({
          customer_id: customerId,
          plan_id: 'premium', // We'll map this based on productId if needed
          stripe_subscription_id: stripeSubscriptionId,
          status: 'active',
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: subscriptionEnd,
        }, {
          onConflict: 'customer_id',
        });

      if (subError) {
        logStep("Error updating subscription", { error: subError.message });
      }
    } else {
      logStep("No active subscription found");
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      product_id: productId,
      subscription_end: subscriptionEnd,
      stripe_subscription_id: stripeSubscriptionId
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
