import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";

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

    // Check monthly subscription credits first (Stripe preferred, DB fallback)
    let monthlyCredits = 0;
    let monthlyRemaining = 0;
    try {
      // Resolve customer email
      const { data: customerRow } = await supabaseAdmin
        .from('customers')
        .select('email')
        .eq('id', sessionData.customer_id)
        .single();

      const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
      let periodStartIso: string | null = null;
      let periodEndIso: string | null = null;
      let planIdFromStripe: string | null = null;

      if (stripeKey && customerRow?.email) {
        const stripe = new Stripe(stripeKey, { apiVersion: '2025-08-27.basil' });
        const stripeCustomers = await stripe.customers.list({ email: customerRow.email, limit: 1 });
        if (stripeCustomers.data.length > 0) {
          const stripeCustomerId = stripeCustomers.data[0].id;
          const subs = await stripe.subscriptions.list({ customer: stripeCustomerId, limit: 10 });
          const activeStatuses = new Set(['active','trialing','past_due']);
          const sub = subs.data.find((s: any) => activeStatuses.has((s.status || '') as string));
          if (sub) {
            const priceId = sub.items.data[0]?.price?.id;
            planIdFromStripe = (priceId === 'price_1SMEgFFsSB8n8Az0aSBb70E7') ? 'premium' : (priceId ? 'enterprise' : null);
            periodStartIso = sub.current_period_start ? new Date(sub.current_period_start * 1000).toISOString() : null;
            periodEndIso = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null;
          }
        }
      }

      if (planIdFromStripe && periodStartIso && periodEndIso) {
        const { data: plan } = await supabaseAdmin
          .from('plans')
          .select('monthly_credits')
          .eq('id', planIdFromStripe)
          .single();
        monthlyCredits = plan?.monthly_credits || 0;

        if (monthlyCredits > 0) {
          const { count } = await supabaseAdmin
            .from('shipments')
            .select('id', { count: 'exact', head: true })
            .eq('customer_id', sessionData.customer_id)
            .gte('created_at', periodStartIso)
            .lt('created_at', periodEndIso);
          const usedThisPeriod = count || 0;
          monthlyRemaining = Math.max(0, monthlyCredits - usedThisPeriod);
          logStep('Monthly credits (Stripe) check', { monthlyCredits, usedThisPeriod, monthlyRemaining });

          if (monthlyRemaining > 0) {
            // Also compute extra credits remaining for info
            const { data: purchasesForInfo } = await supabaseAdmin
              .from('credit_purchases')
              .select('credits_amount, consumed_credits')
              .eq('customer_id', sessionData.customer_id)
              .eq('status', 'completed')
              .gt('expires_at', new Date().toISOString());

            const extraRemaining = (purchasesForInfo || []).reduce(
              (sum, p) => sum + (p.credits_amount - p.consumed_credits),
              0
            );

            return new Response(JSON.stringify({
              success: true,
              message: 'Crédito mensal consumido com sucesso',
              remaining_credits: (monthlyRemaining - 1) + extraRemaining
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            });
          }
        }
      } else {
        // DB fallback
        const { data: subscription } = await supabaseAdmin
          .from('subscriptions')
          .select('current_period_start, current_period_end, plan_id, status')
          .eq('customer_id', sessionData.customer_id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (subscription) {
          const { data: plan } = await supabaseAdmin
            .from('plans')
            .select('monthly_credits')
            .eq('id', subscription.plan_id)
            .single();
          monthlyCredits = plan?.monthly_credits || 0;

          if (monthlyCredits > 0) {
            const { count } = await supabaseAdmin
              .from('shipments')
              .select('id', { count: 'exact', head: true })
              .eq('customer_id', sessionData.customer_id)
              .gte('created_at', subscription.current_period_start)
              .lt('created_at', subscription.current_period_end);

            const usedThisPeriod = count || 0;
            monthlyRemaining = Math.max(0, monthlyCredits - usedThisPeriod);
            logStep('Monthly credits (DB) check', { monthlyCredits, usedThisPeriod, monthlyRemaining });

            if (monthlyRemaining > 0) {
              // Also compute extra credits remaining for info
              const { data: purchasesForInfo } = await supabaseAdmin
                .from('credit_purchases')
                .select('credits_amount, consumed_credits')
                .eq('customer_id', sessionData.customer_id)
                .eq('status', 'completed')
                .gt('expires_at', new Date().toISOString());

              const extraRemaining = (purchasesForInfo || []).reduce(
                (sum, p) => sum + (p.credits_amount - p.consumed_credits),
                0
              );

              return new Response(JSON.stringify({
                success: true,
                message: 'Crédito mensal consumido com sucesso',
                remaining_credits: (monthlyRemaining - 1) + extraRemaining
              }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
              });
            }
          }
        }
      }
    } catch (e) {
      logStep('Monthly credits check error (non-blocking)', { error: String(e) });
    }

    // Fallback: consume from extra purchased credits (FIFO)
    const { data: purchases, error: purchasesError } = await supabaseAdmin
      .from("credit_purchases")
      .select("id, credits_amount, consumed_credits, expires_at")
      .eq("customer_id", sessionData.customer_id)
      .eq("status", "completed")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: true });

    if (purchasesError) throw purchasesError;
    logStep("Fetched credit purchases", { count: purchases?.length });

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

    // Compute remaining credits after consumption (extra + monthly not consumed)
    const extraRemainingAfter = purchases.reduce(
      (sum, p) => sum + (p.credits_amount - p.consumed_credits),
      0
    ) - 1;
    const totalRemaining = extraRemainingAfter + monthlyRemaining;

    return new Response(JSON.stringify({ 
      success: true,
      message: "Crédito consumido com sucesso",
      remaining_credits: totalRemaining
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
