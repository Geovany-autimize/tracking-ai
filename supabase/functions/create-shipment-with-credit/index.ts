import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-session-token",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-SHIPMENT-WITH-CREDIT] ${step}${detailsStr}`);
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

    // Validate session
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

    // Parse request body
    const body = await req.json();
    const {
      tracking_code,
      shipment_customer_id,
      auto_tracking = true,
    } = body;

    if (!tracking_code) {
      throw new Error("tracking_code is required");
    }

    // Check if tracking code already exists
    const { data: existingShipment } = await supabaseAdmin
      .from("shipments")
      .select("id")
      .eq("customer_id", sessionData.customer_id)
      .eq("tracking_code", tracking_code)
      .maybeSingle();

    if (existingShipment) {
      return new Response(JSON.stringify({
        success: false,
        error: "DUPLICATE_TRACKING_CODE",
        message: "Este código de rastreio já existe"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Check monthly subscription credits first
    let monthlyCredits = 0;
    let monthlyRemaining = 0;
    let subscriptionPeriodStart: string | null = null;
    let subscriptionPeriodEnd: string | null = null;
    let sourceType: 'monthly' | 'purchase' = 'purchase';
    let purchaseId: string | null = null;

    try {
      // Resolve customer email and created_at for Free plan check
      const { data: customerRow } = await supabaseAdmin
        .from('customers')
        .select('email, created_at')
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

      // Check monthly credits (Stripe first, then DB fallback)
      if (planIdFromStripe && periodStartIso && periodEndIso) {
        const { data: plan } = await supabaseAdmin
          .from('plans')
          .select('monthly_credits')
          .eq('id', planIdFromStripe)
          .single();
        monthlyCredits = plan?.monthly_credits || 0;

        if (monthlyCredits > 0) {
          // Count credits used this period via credit_usage
          const { count } = await supabaseAdmin
            .from('credit_usage')
            .select('id', { count: 'exact', head: true })
            .eq('customer_id', sessionData.customer_id)
            .eq('source_type', 'monthly')
            .gte('subscription_period_start', periodStartIso)
            .lt('subscription_period_end', periodEndIso);

          const usedThisPeriod = count || 0;
          monthlyRemaining = Math.max(0, monthlyCredits - usedThisPeriod);
          logStep('Monthly credits (Stripe) check', { monthlyCredits, usedThisPeriod, monthlyRemaining });

          if (monthlyRemaining > 0) {
            sourceType = 'monthly';
            subscriptionPeriodStart = periodStartIso;
            subscriptionPeriodEnd = periodEndIso;
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
            // Count credits used this period via credit_usage
            const { count } = await supabaseAdmin
              .from('credit_usage')
              .select('id', { count: 'exact', head: true })
              .eq('customer_id', sessionData.customer_id)
              .eq('source_type', 'monthly')
              .gte('subscription_period_start', subscription.current_period_start)
              .lt('subscription_period_end', subscription.current_period_end);

            const usedThisPeriod = count || 0;
            monthlyRemaining = Math.max(0, monthlyCredits - usedThisPeriod);
            logStep('Monthly credits (DB) check', { monthlyCredits, usedThisPeriod, monthlyRemaining });

            if (monthlyRemaining > 0) {
              sourceType = 'monthly';
              subscriptionPeriodStart = subscription.current_period_start;
              subscriptionPeriodEnd = subscription.current_period_end;
            }
          }
        } else {
          // Free plan fallback - calculate period based on created_at
          const { data: freePlanData } = await supabaseAdmin
            .from('plans')
            .select('monthly_credits')
            .eq('id', 'free')
            .single();

          if (freePlanData && customerRow?.created_at) {
            monthlyCredits = freePlanData.monthly_credits || 0;

            if (monthlyCredits > 0) {
              // Calculate Free plan period
              const accountCreationDate = new Date(customerRow.created_at);
              const today = new Date();
              const dayOfMonth = accountCreationDate.getDate();
              
              const periodStart = new Date(today.getFullYear(), today.getMonth(), dayOfMonth);
              if (periodStart > today) {
                periodStart.setMonth(periodStart.getMonth() - 1);
              }
              
              const periodEnd = new Date(periodStart);
              periodEnd.setMonth(periodEnd.getMonth() + 1);
              
              periodStartIso = periodStart.toISOString();
              periodEndIso = periodEnd.toISOString();

              // Count usage in current Free period
              const { count } = await supabaseAdmin
                .from('credit_usage')
                .select('id', { count: 'exact', head: true })
                .eq('customer_id', sessionData.customer_id)
                .eq('source_type', 'monthly')
                .gte('created_at', periodStartIso)
                .lt('created_at', periodEndIso);

              const usedThisPeriod = count || 0;
              monthlyRemaining = Math.max(0, monthlyCredits - usedThisPeriod);
              logStep('Monthly credits (Free plan) check', { monthlyCredits, usedThisPeriod, monthlyRemaining });

              if (monthlyRemaining > 0) {
                sourceType = 'monthly';
                subscriptionPeriodStart = periodStartIso;
                subscriptionPeriodEnd = periodEndIso;
              }
            }
          }
        }
      }
    } catch (e) {
      logStep('Monthly credits check error (non-blocking)', { error: String(e) });
    }

    // If no monthly credits, check extra purchased credits
    if (sourceType === 'purchase') {
      // Get all valid purchases
      const { data: purchases, error: purchasesError } = await supabaseAdmin
        .from("credit_purchases")
        .select("id, credits_amount")
        .eq("customer_id", sessionData.customer_id)
        .eq("status", "completed")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: true });

      if (purchasesError) throw purchasesError;

      // Find first purchase with available credits
      for (const purchase of purchases || []) {
        // Count credits used from this purchase
        const { count } = await supabaseAdmin
          .from('credit_usage')
          .select('id', { count: 'exact', head: true })
          .eq('customer_id', sessionData.customer_id)
          .eq('source_type', 'purchase')
          .eq('purchase_id', purchase.id);

        const usedFromPurchase = count || 0;
        const remaining = purchase.credits_amount - usedFromPurchase;

        if (remaining > 0) {
          purchaseId = purchase.id;
          logStep('Using purchase credit', { purchaseId, remaining });
          break;
        }
      }

      if (!purchaseId) {
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
    }

    // Execute transaction: create shipment and credit_usage atomically
    logStep("Starting transaction", { sourceType, purchaseId, subscriptionPeriodStart });

    // Use RPC function for atomic transaction
    const { data: result, error: rpcError } = await supabaseAdmin.rpc('create_shipment_with_credit', {
      p_customer_id: sessionData.customer_id,
      p_tracking_code: tracking_code,
      p_source_type: sourceType,
      p_shipment_customer_id: shipment_customer_id || null,
      p_auto_tracking: auto_tracking,
      p_purchase_id: purchaseId,
      p_subscription_period_start: subscriptionPeriodStart,
      p_subscription_period_end: subscriptionPeriodEnd,
    });

    if (rpcError) {
      logStep("Transaction failed", { error: rpcError.message });
      throw rpcError;
    }

    logStep("Transaction succeeded", { shipmentId: result?.shipment_id });

    // Calculate remaining credits for response
    let extraRemaining = 0;
    if (sourceType === 'monthly') {
      // Get extra credits remaining
      const { data: purchasesForInfo } = await supabaseAdmin
        .from('credit_purchases')
        .select('id, credits_amount')
        .eq('customer_id', sessionData.customer_id)
        .eq('status', 'completed')
        .gt('expires_at', new Date().toISOString());

      for (const purchase of purchasesForInfo || []) {
        const { count } = await supabaseAdmin
          .from('credit_usage')
          .select('id', { count: 'exact', head: true })
          .eq('customer_id', sessionData.customer_id)
          .eq('source_type', 'purchase')
          .eq('purchase_id', purchase.id);

        const used = count || 0;
        extraRemaining += purchase.credits_amount - used;
      }
    }

    const totalRemaining = (sourceType === 'monthly' ? monthlyRemaining - 1 : 0) + extraRemaining;

    return new Response(JSON.stringify({
      success: true,
      message: "Shipment criado e crédito consumido com sucesso",
      shipment_id: result?.shipment_id,
      remaining_credits: totalRemaining,
      source_type: sourceType
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

