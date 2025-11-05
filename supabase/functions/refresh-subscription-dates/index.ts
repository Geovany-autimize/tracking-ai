import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-session-token",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[REFRESH-DATES] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Starting refresh of subscription dates");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Fetch all active subscriptions that have a stripe_subscription_id
    const { data: subs, error: subsError } = await supabase
      .from("subscriptions")
      .select("id, customer_id, plan_id, stripe_subscription_id, current_period_start, current_period_end, cancel_at_period_end")
      .eq("status", "active")
      .not("stripe_subscription_id", "is", null);

    if (subsError) throw subsError;

    logStep("Found subscriptions to refresh", { count: subs?.length || 0 });

    const results = {
      total: subs?.length || 0,
      updated: 0,
      skipped: 0,
      errors: [] as any[],
    };

    for (const dbSub of subs || []) {
      try {
        if (!dbSub.stripe_subscription_id) {
          results.skipped++;
          continue;
        }

        const sub = await stripe.subscriptions.retrieve(dbSub.stripe_subscription_id, {
          expand: ['items.data.price']
        });

        // Log COMPLETE Stripe subscription for debugging
        logStep("FULL STRIPE OBJECT", JSON.stringify(sub, null, 2));
        
        // Log specific fields we're interested in
        logStep("Extracted fields", {
          id: sub.id,
          status: sub.status,
          current_period_start: sub.current_period_start,
          current_period_end: sub.current_period_end,
          start_date: sub.start_date,
          created: sub.created,
          items_count: sub.items?.data?.length || 0,
          first_item: sub.items?.data?.[0] ? {
            id: sub.items.data[0].id,
            price_id: sub.items.data[0].price?.id,
          } : null,
          cancel_at_period_end: sub.cancel_at_period_end,
        });

        // Validate that we have the required timestamp fields
        if (!sub.current_period_start || !sub.current_period_end) {
          logStep("WARNING: Missing period timestamps from Stripe", {
            stripeId: sub.id,
            has_start: !!sub.current_period_start,
            has_end: !!sub.current_period_end,
            has_start_date: !!sub.start_date
          });
        }

        // Convert Unix timestamps to ISO strings with validation and fallback
        let startIso: string | null = null;
        let endIso: string | null = null;

        try {
          if (sub.current_period_start && typeof sub.current_period_start === 'number') {
            startIso = new Date(sub.current_period_start * 1000).toISOString();
          } else if (sub.start_date && typeof sub.start_date === 'number') {
            startIso = new Date(sub.start_date * 1000).toISOString();
            logStep("Using start_date as fallback for current_period_start");
          }

          if (sub.current_period_end && typeof sub.current_period_end === 'number') {
            endIso = new Date(sub.current_period_end * 1000).toISOString();
          }
        } catch (dateError) {
          logStep("ERROR converting dates", {
            error: dateError instanceof Error ? dateError.message : String(dateError),
            raw_start: sub.current_period_start,
            raw_end: sub.current_period_end
          });
        }

        logStep("Converted ISO dates", { startIso, endIso });

        // Map price to plan_id
        const priceId = sub.items.data[0]?.price?.id;
        let planId = dbSub.plan_id || 'free';
        if (priceId === 'price_1SMEgFFsSB8n8Az0aSBb70E7') planId = 'premium';
        else if (priceId) planId = 'enterprise';

        // Coalesce with existing DB values to prevent overwriting with null
        const startToSave = startIso ?? dbSub.current_period_start;
        const endToSave = endIso ?? dbSub.current_period_end;

        logStep("Values to save (after coalescing)", {
          startToSave,
          endToSave,
          dbStart: dbSub.current_period_start,
          dbEnd: dbSub.current_period_end,
        });

        // Check if dates are actually different before updating
        const datesChanged = 
          startToSave !== dbSub.current_period_start || 
          endToSave !== dbSub.current_period_end;
        
        const otherFieldsChanged =
          (sub.cancel_at_period_end || false) !== (dbSub.cancel_at_period_end || false) ||
          planId !== dbSub.plan_id;

        if (!datesChanged && !otherFieldsChanged) {
          logStep("Skipping update - no changes detected", {
            supabaseId: dbSub.id,
            stripeId: sub.id
          });
          results.skipped++;
          continue;
        }

        const payload: any = {
          current_period_start: startToSave,
          current_period_end: endToSave,
          cancel_at_period_end: sub.cancel_at_period_end || false,
          status: sub.status || 'active',
          plan_id: planId,
          stripe_subscription_id: sub.id,
        };

        const { error: updateError } = await supabase
          .from("subscriptions")
          .update(payload)
          .eq("id", dbSub.id);
        if (updateError) throw updateError;

        results.updated++;
        logStep("Updated dates for subscription", {
          supabaseId: dbSub.id,
          stripeId: sub.id,
          startToSave,
          endToSave,
          cancelAtPeriodEnd: payload.cancel_at_period_end,
          status: payload.status,
          planId,
          datesChanged,
          otherFieldsChanged
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        results.errors.push({ id: dbSub.id, stripeId: dbSub.stripe_subscription_id, error: msg });
        logStep("ERROR refreshing one subscription", { id: dbSub.id, error: msg });
      }
    }

    logStep("Refresh completed", results);

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in refresh-subscription-dates", { error: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});