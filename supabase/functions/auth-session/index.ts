import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-session-token, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const sessionToken = req.headers.get('x-session-token');
    if (!sessionToken) {
      return new Response(
        JSON.stringify({ error: 'Token não fornecido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get session (tolerant to slight replication delays)
    let { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('customer_id, expires_at')
      .eq('token_jti', sessionToken)
      .maybeSingle();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'Sessão inválida' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if session is expired
    if (new Date(session.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'Sessão expirada' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get customer data
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, email, name, whatsapp_e164, avatar_url, status, created_at')
      .eq('id', session.customer_id)
      .single();

    if (customerError || !customer) {
      return new Response(
        JSON.stringify({ error: 'Cliente não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get active subscription from DB
    const { data: dbSubscription } = await supabase
      .from('subscriptions')
      .select('plan_id, status, current_period_start, current_period_end, stripe_subscription_id')
      .eq('customer_id', customer.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Try to resolve subscription status directly from Stripe
    let finalSubscription = dbSubscription as
      | { plan_id: string; status: string; current_period_start: string; current_period_end: string; cancel_at_period_end?: boolean; stripe_subscription_id?: string; canceled_at?: string | null }
      | null;

    try {
      const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
      if (stripeKey && customer.email) {
        const stripe = new Stripe(stripeKey, { apiVersion: '2025-08-27.basil' });
        
        let sub = null;
        
        // PRIORITY: Use stripe_subscription_id if available (1 API call)
        if (dbSubscription?.stripe_subscription_id) {
          try {
            sub = await stripe.subscriptions.retrieve(dbSubscription.stripe_subscription_id);
            console.log('[AUTH-SESSION] Retrieved subscription by ID:', sub.id);
          } catch (err) {
            console.log('[AUTH-SESSION] Subscription ID not found, falling back to email lookup');
          }
        }
        
        // FALLBACK: Use email lookup (3 API calls)
        if (!sub) {
          const stripeCustomers = await stripe.customers.list({ email: customer.email, limit: 1 });
          if (stripeCustomers.data.length > 0) {
            const stripeCustomerId = stripeCustomers.data[0].id;
            const subs = await stripe.subscriptions.list({ customer: stripeCustomerId, status: 'active', limit: 1 });
            if (subs.data.length > 0) {
              sub = subs.data[0];
            }
          }
        }
        
        if (sub) {
          const priceId = sub.items.data[0]?.price?.id;
          let planId = 'free';
          if (priceId === 'price_1SMEgFFsSB8n8Az0aSBb70E7') {
            planId = 'premium';
          } else if (priceId) {
            planId = 'enterprise';
          }

          const startIso = sub.current_period_start ? new Date(sub.current_period_start * 1000).toISOString() : dbSubscription?.current_period_start;
          const endIso = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : dbSubscription?.current_period_end;
          const stripeCanceledAt = sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString().replace(/\.\d{3}Z$/, '+00:00') : null;

          // Set subscription if we have valid dates (from Stripe or DB)
          if (startIso && endIso) {
            finalSubscription = {
              plan_id: planId,
              status: sub.status || 'active',
              current_period_start: startIso,
              current_period_end: endIso,
              cancel_at_period_end: sub.cancel_at_period_end || false,
              stripe_subscription_id: sub.id,
              canceled_at: stripeCanceledAt
            };
          }
        }
      }
    } catch (e) {
      console.log('[AUTH-SESSION] Stripe check failed', e);
    }

    // Sync subscriptions table with Stripe result, then fetch plan details
    let plan = null as any;
    if (finalSubscription) {
      // Fetch most recent active subscription
      const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('id, plan_id, current_period_start, current_period_end, cancel_at_period_end, status, stripe_subscription_id')
        .eq('customer_id', customer.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const stripeSubId = (finalSubscription as any).stripe_subscription_id || null;
      
      // CASE 1: No active subscription in DB but exists in Stripe → CREATE
      if (!existingSub) {
        console.log('[AUTH-SESSION] 🆕 No active subscription in DB, creating new from Stripe', {
          stripe_subscription_id: stripeSubId,
          customer_id: customer.id
        });

        await supabase
          .from('subscriptions')
          .insert({
            customer_id: customer.id,
            plan_id: finalSubscription.plan_id,
            status: 'active',
            stripe_subscription_id: stripeSubId,
            current_period_start: finalSubscription.current_period_start,
            current_period_end: finalSubscription.current_period_end,
            cancel_at_period_end: finalSubscription.cancel_at_period_end ?? false,
            canceled_at: (finalSubscription as any).canceled_at || null
          });

        console.log('[AUTH-SESSION] ✅ New subscription created from Stripe');
      }
      // CASE 2: Subscription exists AND stripe_subscription_id changed → CANCEL old + CREATE new
      else if (existingSub.stripe_subscription_id && stripeSubId && existingSub.stripe_subscription_id !== stripeSubId) {
        console.log('[AUTH-SESSION] 🔄 Stripe subscription ID changed - marking old as canceled and creating new', {
          old_stripe_id: existingSub.stripe_subscription_id,
          new_stripe_id: stripeSubId,
          customer_id: customer.id
        });

        // Mark old subscription as canceled
        await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            canceled_at: new Date().toISOString()
          })
          .eq('id', existingSub.id);

        // Create new subscription
        await supabase
          .from('subscriptions')
          .insert({
            customer_id: customer.id,
            plan_id: finalSubscription.plan_id,
            status: 'active',
            stripe_subscription_id: stripeSubId,
            current_period_start: finalSubscription.current_period_start,
            current_period_end: finalSubscription.current_period_end,
            cancel_at_period_end: false,
            canceled_at: (finalSubscription as any).canceled_at || null
          });

        console.log('[AUTH-SESSION] ✅ Old subscription canceled, new subscription created');
      }
      // CASE 3: Same subscription → UPDATE if changed
      else {
        const dbStartMs = existingSub.current_period_start ? new Date(existingSub.current_period_start).getTime() : null;
        const dbEndMs = existingSub.current_period_end ? new Date(existingSub.current_period_end).getTime() : null;
        const stripeStartMs = finalSubscription.current_period_start ? new Date(finalSubscription.current_period_start).getTime() : null;
        const stripeEndMs = finalSubscription.current_period_end ? new Date(finalSubscription.current_period_end).getTime() : null;

        const needsUpdate = 
          existingSub.plan_id !== finalSubscription.plan_id ||
          dbStartMs !== stripeStartMs ||
          dbEndMs !== stripeEndMs ||
          existingSub.cancel_at_period_end !== (finalSubscription.cancel_at_period_end ?? false) ||
          !existingSub.stripe_subscription_id;

        if (needsUpdate) {
          console.log('[AUTH-SESSION] 🔄 Updating existing subscription', {
            stripe_subscription_id: stripeSubId,
            changes: {
              plan: existingSub.plan_id !== finalSubscription.plan_id,
              period_start: dbStartMs !== stripeStartMs,
              period_end: dbEndMs !== stripeEndMs,
              cancel_flag: existingSub.cancel_at_period_end !== (finalSubscription.cancel_at_period_end ?? false)
            }
          });

          const payload = {
            plan_id: finalSubscription.plan_id,
            status: finalSubscription.status,
            cancel_at_period_end: finalSubscription.cancel_at_period_end ?? false,
            stripe_subscription_id: stripeSubId,
            canceled_at: (finalSubscription as any).canceled_at || null
          } as any;

          // Only include dates if we have them from Stripe
          if (finalSubscription.current_period_start) {
            payload.current_period_start = finalSubscription.current_period_start;
          }
          if (finalSubscription.current_period_end) {
            payload.current_period_end = finalSubscription.current_period_end;
          }

          await supabase
            .from('subscriptions')
            .update(payload)
            .eq('id', existingSub.id);
            
          console.log('[AUTH-SESSION] ✅ Subscription updated successfully');
        } else {
          console.log('[AUTH-SESSION] ✅ No changes detected, keeping existing subscription');
        }
      }

      const { data: planData } = await supabase
        .from('plans')
        .select('*')
        .eq('id', finalSubscription.plan_id)
        .single();
      plan = planData;
    }

    return new Response(
      JSON.stringify({
        customer: {
          id: customer.id,
          email: customer.email,
          name: customer.name,
          whatsapp_e164: customer.whatsapp_e164,
          avatar_url: customer.avatar_url,
          status: customer.status,
          created_at: customer.created_at,
        },
        subscription: finalSubscription ? {
          plan_id: finalSubscription.plan_id,
          status: finalSubscription.status,
          current_period_start: finalSubscription.current_period_start,
          current_period_end: finalSubscription.current_period_end,
          cancel_at_period_end: finalSubscription.cancel_at_period_end,
        } : null,
        plan: plan,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in auth-session:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
