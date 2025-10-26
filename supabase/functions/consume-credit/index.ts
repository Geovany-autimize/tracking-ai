import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-session-token",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CONSUME-CREDIT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

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

    // Find the oldest purchase with available credits (FIFO logic)
    const { data: purchases, error: purchasesError } = await supabaseAdmin
      .from("credit_purchases")
      .select("id, credits_amount, consumed_credits, expires_at")
      .eq("customer_id", sessionData.customer_id)
      .eq("status", "completed")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: true });

    if (purchasesError) throw purchasesError;
    logStep("Fetched credit purchases", { count: purchases?.length });

    // Find first purchase with available credits
    const availablePurchase = purchases?.find(
      (p) => p.consumed_credits < p.credits_amount
    );

    if (!availablePurchase) {
      logStep("No available credits");
      return new Response(JSON.stringify({ 
        success: false,
        error: "NO_CREDITS",
        message: "Sem créditos disponíveis" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Increment consumed_credits atomically
    const { error: updateError } = await supabaseAdmin
      .from("credit_purchases")
      .update({
        consumed_credits: availablePurchase.consumed_credits + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", availablePurchase.id);

    if (updateError) throw updateError;

    logStep("Credit consumed successfully", { 
      purchaseId: availablePurchase.id,
      newConsumedCount: availablePurchase.consumed_credits + 1 
    });

    // Check if auto-recharge should be triggered
    const { data: autoRechargeSettings } = await supabaseAdmin
      .from("auto_recharge_settings")
      .select("enabled, min_credits_threshold")
      .eq("customer_id", sessionData.customer_id)
      .single();

    if (autoRechargeSettings?.enabled) {
      // Calculate remaining credits
      const remainingCredits = purchases.reduce(
        (sum, p) => sum + (p.credits_amount - p.consumed_credits),
        0
      ) - 1; // Subtract the one we just consumed

      logStep("Auto-recharge check", { 
        remainingCredits, 
        threshold: autoRechargeSettings.min_credits_threshold 
      });

      if (remainingCredits <= autoRechargeSettings.min_credits_threshold) {
        logStep("Triggering auto-recharge check");
        // Trigger auto-recharge in background (don't await)
        fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/check-and-trigger-auto-recharge`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "x-session-token": token,
            "Content-Type": "application/json",
          },
        }).catch((e) => logStep("Auto-recharge trigger error (non-blocking)", e));
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: "Crédito consumido com sucesso",
      remaining_credits: availablePurchase.credits_amount - availablePurchase.consumed_credits - 1
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
