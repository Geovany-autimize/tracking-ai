import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-session-token",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CUSTOMER-PORTAL] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

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
      throw new Error("No Stripe customer found for this user");
    }
    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const origin = req.headers.get("origin") || "http://localhost:3000";
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/dashboard/billing`,
    });
    logStep("Customer portal session created", { sessionId: portalSession.id, url: portalSession.url });

    return new Response(JSON.stringify({ url: portalSession.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in customer-portal", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
