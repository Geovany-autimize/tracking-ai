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

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    const sessionToken = req.headers.get("x-session-token");
    const token = sessionToken || (authHeader ? authHeader.replace("Bearer ", "") : null);
    if (!token) throw new Error("No session token provided");

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Buscar configurações de auto-recarga
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from("auto_recharge_settings")
      .select("*")
      .eq("customer_id", user.id)
      .eq("enabled", true)
      .single();

    if (settingsError || !settings) {
      logStep("Auto-recharge not enabled or not configured");
      return new Response(JSON.stringify({ message: "Auto-recharge not enabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Settings found", settings);

    // Calcular créditos disponíveis
    const { data: purchases } = await supabaseAdmin
      .from("credit_purchases")
      .select("*")
      .eq("customer_id", user.id)
      .eq("status", "completed")
      .gt("expires_at", new Date().toISOString());

    const availableCredits = purchases?.reduce((sum, p) => 
      sum + (p.credits_amount - p.consumed_credits), 0
    ) || 0;

    logStep("Available credits calculated", { availableCredits, threshold: settings.min_credits_threshold });

    // Verificar se precisa recarregar
    if (availableCredits >= settings.min_credits_threshold) {
      logStep("Credits above threshold, no recharge needed");
      return new Response(JSON.stringify({ 
        message: "Credits above threshold",
        availableCredits,
        threshold: settings.min_credits_threshold
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Precisa recarregar!
    logStep("Credits below threshold, initiating recharge");

    if (!settings.stripe_payment_method_id) {
      throw new Error("No payment method configured");
    }

    // Calcular custo
    const totalCents = settings.recharge_amount * CREDIT_PRICE_CENTS;
    logStep("Recharge cost calculated", { credits: settings.recharge_amount, totalCents });

    // Obter cliente Stripe
    const { data: customer } = await supabaseAdmin
      .from("customers")
      .select("email, stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (!customer?.email) throw new Error("Customer email not found");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    let stripeCustomerId = customer.stripe_customer_id;
    if (!stripeCustomerId) {
      const customers = await stripe.customers.list({ email: customer.email, limit: 1 });
      if (customers.data.length > 0) {
        stripeCustomerId = customers.data[0].id;
      }
    }

    if (!stripeCustomerId) throw new Error("Stripe customer not found");

    // Criar PaymentIntent off-session
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalCents,
      currency: "brl",
      customer: stripeCustomerId,
      payment_method: settings.stripe_payment_method_id,
      off_session: true,
      confirm: true,
      description: `Recarga automática de ${settings.recharge_amount} créditos`,
      metadata: {
        customer_id: user.id,
        credits_amount: settings.recharge_amount.toString(),
        is_auto_recharge: "true",
      },
    });

    logStep("PaymentIntent created", { 
      paymentIntentId: paymentIntent.id, 
      status: paymentIntent.status 
    });

    if (paymentIntent.status === "succeeded") {
      // Registrar compra
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 6); // 6 meses de validade

      const { error: purchaseError } = await supabaseAdmin
        .from("credit_purchases")
        .insert({
          customer_id: user.id,
          credits_amount: settings.recharge_amount,
          price_cents: totalCents,
          price_per_credit_cents: CREDIT_PRICE_CENTS,
          stripe_payment_intent_id: paymentIntent.id,
          status: "completed",
          is_auto_recharge: true,
          expires_at: expiresAt.toISOString(),
        });

      if (purchaseError) throw purchaseError;

      logStep("Credit purchase recorded successfully");

      return new Response(JSON.stringify({ 
        success: true,
        message: "Recarga automática realizada com sucesso",
        credits: settings.recharge_amount,
        amount: totalCents / 100,
        paymentIntentId: paymentIntent.id
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else {
      throw new Error(`Payment failed with status: ${paymentIntent.status}`);
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
