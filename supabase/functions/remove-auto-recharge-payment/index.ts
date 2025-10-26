import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[REMOVE-AUTO-RECHARGE-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Buscar configurações
    const { data: settings } = await supabaseClient
      .from("auto_recharge_settings")
      .select("stripe_payment_method_id")
      .eq("customer_id", user.id)
      .single();

    if (settings?.stripe_payment_method_id) {
      // Desvincular método de pagamento no Stripe
      const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
      
      try {
        await stripe.paymentMethods.detach(settings.stripe_payment_method_id);
        logStep("Payment method detached from Stripe");
      } catch (stripeError) {
        logStep("Error detaching payment method (might already be detached)", stripeError);
      }
    }

    // Atualizar configurações (desativar e limpar método de pagamento)
    const { error: updateError } = await supabaseClient
      .from("auto_recharge_settings")
      .update({
        enabled: false,
        stripe_payment_method_id: null,
        last_payment_method_details: null,
        updated_at: new Date().toISOString(),
      })
      .eq("customer_id", user.id);

    if (updateError) throw updateError;

    logStep("Settings updated - payment method removed and auto-recharge disabled");

    return new Response(JSON.stringify({ 
      success: true,
      message: "Método de pagamento removido e recarga automática desativada"
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
