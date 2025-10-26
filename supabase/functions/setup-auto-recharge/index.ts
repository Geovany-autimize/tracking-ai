import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-session-token",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SETUP-AUTO-RECHARGE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    // Create admin client for database operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Extract session token
    const sessionToken = req.headers.get("x-session-token");
    const authHeader = req.headers.get("Authorization");
    const token = sessionToken || (authHeader ? authHeader.replace("Bearer ", "") : null);
    if (!token) throw new Error("No session token provided");
    logStep("Token extracted", { tokenLength: token.length });

    // Validate session via sessions table
    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .from("sessions")
      .select("customer_id")
      .eq("token_jti", token)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (sessionError || !sessionData) {
      logStep("Session validation failed", { error: sessionError?.message });
      throw new Error("Invalid or expired session");
    }
    logStep("Session validated", { customerId: sessionData.customer_id });

    // Get customer details
    const { data: customer, error: customerError } = await supabaseAdmin
      .from("customers")
      .select("id, email, stripe_customer_id")
      .eq("id", sessionData.customer_id)
      .single();

    if (customerError || !customer) {
      logStep("Customer not found", { error: customerError?.message });
      throw new Error("Customer not found");
    }
    logStep("Customer fetched", { customerId: customer.id, email: customer.email });

    // Get or create Stripe customer
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    let stripeCustomerId = customer.stripe_customer_id;
    
    if (!stripeCustomerId) {
      // Try to find existing customer by email
      const customers = await stripe.customers.list({ email: customer.email, limit: 1 });
      
      if (customers.data.length > 0) {
        stripeCustomerId = customers.data[0].id;
        logStep("Existing Stripe customer found", { stripeCustomerId });
      } else {
        // Create new Stripe customer
        const newCustomer = await stripe.customers.create({ email: customer.email });
        stripeCustomerId = newCustomer.id;
        logStep("New Stripe customer created", { stripeCustomerId });
      }

      // Save stripe_customer_id to database
      await supabaseAdmin
        .from("customers")
        .update({ stripe_customer_id: stripeCustomerId })
        .eq("id", customer.id);
      logStep("Stripe customer ID saved to database");
    } else {
      logStep("Using existing Stripe customer from database", { stripeCustomerId });
    }

    // Create Checkout Session in setup mode
    const origin = req.headers.get("origin") || "http://localhost:3000";
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "setup",
      payment_method_types: ["card"],
      success_url: `${origin}/dashboard/billing?setup=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dashboard/billing?setup=canceled`,
    });

    logStep("Setup session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
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
