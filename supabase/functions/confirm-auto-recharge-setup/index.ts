import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-session-token",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CONFIRM-AUTO-RECHARGE-SETUP] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { sessionId } = await req.json();
    if (!sessionId) throw new Error("Session ID is required");

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
    logStep("Token extracted");

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

    // Verificar sessão no Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (session.status !== "complete") {
      throw new Error("Session not completed");
    }

    const setupIntentId = session.setup_intent as string;
    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
    const paymentMethodId = setupIntent.payment_method as string;

    logStep("Setup intent retrieved", { setupIntentId, paymentMethodId });

    // Obter detalhes do método de pagamento
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    const paymentDetails = {
      last4: paymentMethod.card?.last4,
      brand: paymentMethod.card?.brand,
      exp_month: paymentMethod.card?.exp_month,
      exp_year: paymentMethod.card?.exp_year,
    };

    logStep("Payment method details", paymentDetails);

    // Check if settings already exist
    const { data: existing } = await supabaseAdmin
      .from("auto_recharge_settings")
      .select("*")
      .eq("customer_id", sessionData.customer_id)
      .single();

    if (existing) {
      // Update existing settings
      const { error: updateError } = await supabaseAdmin
        .from("auto_recharge_settings")
        .update({
          stripe_payment_method_id: paymentMethodId,
          last_payment_method_details: paymentDetails,
          updated_at: new Date().toISOString(),
        })
        .eq("customer_id", sessionData.customer_id);

      if (updateError) throw updateError;
      logStep("Settings updated");
    } else {
      // Create new settings with defaults
      const { error: insertError } = await supabaseAdmin
        .from("auto_recharge_settings")
        .insert({
          customer_id: sessionData.customer_id,
          stripe_payment_method_id: paymentMethodId,
          last_payment_method_details: paymentDetails,
          enabled: false,
          min_credits_threshold: 100,
          recharge_amount: 500,
        });

      if (insertError) throw insertError;
      logStep("Settings created");
    }

    return new Response(JSON.stringify({ 
      success: true,
      paymentDetails 
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
