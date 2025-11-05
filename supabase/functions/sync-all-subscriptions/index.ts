import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-session-token",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SYNC-ALL-SUBSCRIPTIONS] ${step}${detailsStr}`);
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
    logStep("Starting sync for all subscriptions");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get all customers
    const { data: customers, error: customersError } = await supabaseClient
      .from("customers")
      .select("id, email, name")
      .eq("status", "active");

    if (customersError) {
      logStep("Error fetching customers", { error: customersError.message });
      throw new Error(`Failed to fetch customers: ${customersError.message}`);
    }

    logStep("Found customers", { count: customers?.length || 0 });

    const results = {
      total: customers?.length || 0,
      updated: 0,
      created: 0,
      removed: 0,
      skipped: 0,
      errors: [] as any[],
    };

    for (const customer of customers || []) {
      try {
        if (!customer.email) {
          logStep("Skipping customer without email", { customerId: customer.id });
          results.skipped++;
          continue;
        }

        // Find Stripe customer
        const stripeCustomers = await stripe.customers.list({ 
          email: customer.email, 
          limit: 1 
        });

        if (stripeCustomers.data.length === 0) {
          logStep("No Stripe customer found, removing subscription if exists", { 
            customerId: customer.id, 
            email: customer.email 
          });
          
          // Remove any existing subscription in DB
          const { error: deleteError } = await supabaseClient
            .from("subscriptions")
            .delete()
            .eq("customer_id", customer.id)
            .eq("status", "active");

          if (!deleteError) results.removed++;
          continue;
        }

        const stripeCustomerId = stripeCustomers.data[0].id;

        // Get active subscriptions
        const subscriptions = await stripe.subscriptions.list({
          customer: stripeCustomerId,
          status: "active",
          limit: 1,
        });

        if (subscriptions.data.length === 0) {
          logStep("No active subscription in Stripe, removing from DB", { 
            customerId: customer.id 
          });

          // Remove subscription from DB
          const { error: deleteError } = await supabaseClient
            .from("subscriptions")
            .delete()
            .eq("customer_id", customer.id)
            .eq("status", "active");

          if (!deleteError) results.removed++;
          continue;
        }

        // Process active subscription
        const sub = subscriptions.data[0];
        const priceId = sub.items.data[0]?.price?.id;
        
        let planId = 'free';
        if (priceId === 'price_1SMEgFFsSB8n8Az0aSBb70E7') {
          planId = 'premium';
        } else if (priceId) {
          planId = 'enterprise';
        }

        // Get dates from Stripe (if available)
        const startIso = sub.current_period_start 
          ? new Date(sub.current_period_start * 1000).toISOString() 
          : null;
        const endIso = sub.current_period_end 
          ? new Date(sub.current_period_end * 1000).toISOString() 
          : null;

        // Check if subscription exists in DB
        const { data: existingSub } = await supabaseClient
          .from("subscriptions")
          .select("id, plan_id, current_period_start, current_period_end, cancel_at_period_end")
          .eq("customer_id", customer.id)
          .eq("status", "active")
          .maybeSingle();

        // Use Stripe dates if available, otherwise keep existing DB dates
        const finalStartIso = startIso || existingSub?.current_period_start;
        const finalEndIso = endIso || existingSub?.current_period_end;

        // Only error if we have no dates at all (neither Stripe nor DB)
        if (!finalStartIso || !finalEndIso) {
          logStep("No valid subscription dates available", { 
            customerId: customer.id,
            subscriptionId: sub.id,
            stripeHasDates: !!(startIso && endIso),
            dbHasDates: !!(existingSub?.current_period_start && existingSub?.current_period_end)
          });
          results.errors.push({
            customerId: customer.id,
            email: customer.email,
            error: "No valid dates from Stripe or DB"
          });
          continue;
        }

        const payload = {
          customer_id: customer.id,
          plan_id: planId,
          status: sub.status || 'active',
          cancel_at_period_end: sub.cancel_at_period_end || false,
          current_period_start: finalStartIso,
          current_period_end: finalEndIso,
        };

        if (existingSub) {
          // Update existing
          const { error: updateError } = await supabaseClient
            .from("subscriptions")
            .update(payload)
            .eq("id", existingSub.id);

          if (updateError) {
            logStep("Error updating subscription", { 
              customerId: customer.id, 
              error: updateError.message 
            });
            results.errors.push({
              customerId: customer.id,
              email: customer.email,
              error: updateError.message
            });
          } else {
            logStep("Updated subscription", { 
              customerId: customer.id, 
              planId,
              oldPlan: existingSub.plan_id 
            });
            results.updated++;
          }
        } else {
          // Create new
          const { error: insertError } = await supabaseClient
            .from("subscriptions")
            .insert(payload);

          if (insertError) {
            logStep("Error creating subscription", { 
              customerId: customer.id, 
              error: insertError.message 
            });
            results.errors.push({
              customerId: customer.id,
              email: customer.email,
              error: insertError.message
            });
          } else {
            logStep("Created subscription", { 
              customerId: customer.id, 
              planId 
            });
            results.created++;
          }
        }

      } catch (customerError) {
        const errorMsg = customerError instanceof Error 
          ? customerError.message 
          : String(customerError);
        logStep("Error processing customer", { 
          customerId: customer.id, 
          error: errorMsg 
        });
        results.errors.push({
          customerId: customer.id,
          email: customer.email,
          error: errorMsg
        });
      }
    }

    logStep("Sync completed", results);

    return new Response(JSON.stringify({
      success: true,
      results
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in sync-all-subscriptions", { message: errorMessage });
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
