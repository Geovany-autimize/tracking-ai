import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-session-token",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-TRIGGER-AUTO-RECHARGE] ${step}${detailsStr}`);
};

const CREDIT_PRICE_CENTS = 50; // R$ 0,50 por crédito

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

    // Get auto-recharge settings
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from("auto_recharge_settings")
      .select("*")
      .eq("customer_id", sessionData.customer_id)
      .eq("enabled", true)
      .single();

    if (settingsError || !settings) {
      logStep("Auto-recharge not enabled or settings not found");
      return new Response(JSON.stringify({ 
        message: "Auto-recharge not enabled",
        recharge_needed: false 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Settings found", { 
      threshold: settings.min_credits_threshold, 
      rechargeAmount: settings.recharge_amount,
      hasPaymentMethod: !!settings.stripe_payment_method_id
    });

    // Calculate available credits
    const { data: purchases, error: purchasesError } = await supabaseAdmin
      .from("credit_purchases")
      .select("credits_amount, consumed_credits")
      .eq("customer_id", sessionData.customer_id)
      .eq("status", "completed")
      .gt("expires_at", new Date().toISOString());

    if (purchasesError) {
      logStep("Error fetching purchases", { error: purchasesError.message });
      throw purchasesError;
    }

    const availableCredits = purchases.reduce((sum, purchase) => {
      return sum + (purchase.credits_amount - purchase.consumed_credits);
    }, 0);

    logStep("Credits calculated", { availableCredits, threshold: settings.min_credits_threshold });

    // If credits below threshold, trigger auto-recharge
    if (availableCredits >= settings.min_credits_threshold) {
      logStep("Credits above threshold, no recharge needed");
      return new Response(JSON.stringify({ 
        message: "Credits sufficient",
        available_credits: availableCredits,
        recharge_needed: false 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Credits below threshold, initiating auto-recharge");

    if (!settings.stripe_payment_method_id) {
      logStep("No payment method configured");
      throw new Error("No payment method configured for auto-recharge");
    }

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

    // Create PaymentIntent off_session
    const amountCents = settings.recharge_amount * CREDIT_PRICE_CENTS;
    
    logStep("Creating PaymentIntent", { 
      amountCents, 
      credits: settings.recharge_amount,
      stripeCustomerId,
      paymentMethodId: settings.stripe_payment_method_id 
    });

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: "brl",
        customer: stripeCustomerId,
        payment_method: settings.stripe_payment_method_id,
        off_session: true,
        confirm: true,
        description: `Recarga automática de ${settings.recharge_amount} créditos`,
        metadata: {
          customer_id: sessionData.customer_id,
          credits_amount: settings.recharge_amount.toString(),
          is_auto_recharge: "true",
        },
      });

      logStep("PaymentIntent created", { 
        paymentIntentId: paymentIntent.id, 
        status: paymentIntent.status 
      });

      if (paymentIntent.status === "succeeded") {
        // Record credit purchase
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 6); // Credits expire in 6 months

        const { error: insertError } = await supabaseAdmin
          .from("credit_purchases")
          .insert({
            customer_id: sessionData.customer_id,
            credits_amount: settings.recharge_amount,
            price_cents: amountCents,
            price_per_credit_cents: CREDIT_PRICE_CENTS,
            status: "completed",
            expires_at: expiresAt.toISOString(),
            stripe_payment_intent_id: paymentIntent.id,
            is_auto_recharge: true,
          });

        if (insertError) {
          logStep("Error recording credit purchase", { error: insertError.message });
          throw insertError;
        }

        logStep("Credit purchase recorded successfully");

        return new Response(JSON.stringify({
          success: true,
          message: "Auto-recharge completed successfully",
          credits_added: settings.recharge_amount,
          amount_charged: amountCents / 100,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      } else {
        logStep("PaymentIntent not succeeded", { status: paymentIntent.status });
        throw new Error(`Payment not completed. Status: ${paymentIntent.status}`);
      }
    } catch (paymentError) {
      logStep("Payment error occurred", { error: paymentError });
      // Could disable auto-recharge here if needed
      throw paymentError;
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });

    // Se erro de pagamento, desativar auto-recarga e notificar usuário
    if (errorMessage.includes("card") || errorMessage.includes("payment")) {
      logStep("Payment error detected, disabling auto-recharge");
      // Aqui você pode adicionar lógica para desativar auto-recarga ou enviar notificação
    }

    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
