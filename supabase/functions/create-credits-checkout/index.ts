import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-session-token",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CREDITS-CHECKOUT] ${step}${detailsStr}`);
};

// Calcula preço por crédito com desconto progressivo
function getPricePerCredit(quantity: number): number {
  if (quantity >= 2500) return 0.20;
  if (quantity >= 1000) return 0.22;
  if (quantity >= 500) return 0.25;
  if (quantity >= 100) return 0.30;
  return 0.35;
}

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
    
    // Get customer email and subscription
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

    // Get subscription to calculate expiration
    const { data: subscriptionData } = await supabaseClient
      .from("subscriptions")
      .select("current_period_end")
      .eq("customer_id", sessionData.customer_id)
      .single();

    const { creditsAmount } = await req.json();
    
    // Validação
    if (!creditsAmount || typeof creditsAmount !== 'number') {
      throw new Error("creditsAmount is required and must be a number");
    }
    if (creditsAmount < 10 || creditsAmount > 5000) {
      throw new Error("creditsAmount must be between 10 and 5000");
    }

    logStep("Request validated", { creditsAmount });

    // Calcula preço
    const pricePerCredit = getPricePerCredit(creditsAmount);
    const totalPriceCents = Math.round(creditsAmount * pricePerCredit * 100);
    
    logStep("Price calculated", { 
      creditsAmount, 
      pricePerCredit, 
      totalPriceCents,
      totalPriceBRL: totalPriceCents / 100 
    });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { 
      apiVersion: "2025-08-27.basil" 
    });
    
    // Check for existing Stripe customer
    const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing Stripe customer found", { customerId });
    } else {
      logStep("New Stripe customer will be created at checkout");
    }

    const origin = req.headers.get("origin") || "http://localhost:3000";
    
    // Data de expiração (fim do período da assinatura ou 30 dias)
    const expiresAt = subscriptionData?.current_period_end || 
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const expirationDate = new Date(expiresAt).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
    
    // Create checkout session with dynamic price_data
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : userEmail,
      line_items: [
        {
          price_data: {
            currency: "brl",
            product_data: {
              name: `${creditsAmount} Créditos Extras`,
              description: `Créditos adicionais para rastreamento (válidos até ${expirationDate})`,
            },
            unit_amount: totalPriceCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/dashboard/billing/credits-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dashboard/billing`,
      metadata: {
        customer_id: sessionData.customer_id,
        credits_amount: creditsAmount.toString(),
        price_cents: totalPriceCents.toString(),
        price_per_credit_cents: Math.round(pricePerCredit * 100).toString(),
      },
    });
    
    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    // Register the purchase as pending
    const { error: insertError } = await supabaseClient
      .from("credit_purchases")
      .insert({
        customer_id: sessionData.customer_id,
        credits_amount: creditsAmount,
        price_cents: totalPriceCents,
        price_per_credit_cents: Math.round(pricePerCredit * 100),
        stripe_session_id: session.id,
        status: "pending",
        expires_at: expiresAt,
      });

    if (insertError) {
      logStep("Error inserting purchase record", { error: insertError });
      throw insertError;
    }

    logStep("Purchase record created as pending");

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-credits-checkout", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
