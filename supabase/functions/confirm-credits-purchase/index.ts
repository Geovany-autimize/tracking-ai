import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-session-token",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CONFIRM-CREDITS-PURCHASE] ${step}${detailsStr}`);
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

    const { sessionId } = await req.json();
    if (!sessionId) {
      throw new Error("Session ID is required");
    }

    logStep("Validating session", { sessionId });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { 
      apiVersion: "2025-08-27.basil" 
    });

    // Get checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    logStep("Stripe session retrieved", { 
      sessionId,
      paymentStatus: session.payment_status,
      paymentIntent: session.payment_intent 
    });

    if (session.payment_status !== "paid") {
      logStep("Payment not completed", { paymentStatus: session.payment_status });
      throw new Error("Payment not completed");
    }

    // Update purchase status in database
    const { data: updateData, error: updateError } = await supabaseClient
      .from("credit_purchases")
      .update({
        status: "completed",
        stripe_payment_intent_id: session.payment_intent as string,
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_session_id", sessionId)
      .select()
      .single();

    if (updateError) {
      logStep("Error updating purchase", { error: updateError });
      throw updateError;
    }

    logStep("Purchase confirmed successfully", { 
      purchaseId: updateData.id,
      creditsAmount: updateData.credits_amount 
    });

    return new Response(JSON.stringify({ 
      success: true,
      purchase: {
        id: updateData.id,
        credits_amount: updateData.credits_amount,
        price_cents: updateData.price_cents,
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in confirm-credits-purchase", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
