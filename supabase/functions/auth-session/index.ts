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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Token não fornecido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sessionToken = authHeader.replace('Bearer ', '');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('customer_id, expires_at')
      .eq('token_jti', sessionToken)
      .single();

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
      .select('id, email, name, whatsapp_e164, avatar_url, status')
      .eq('id', session.customer_id)
      .single();

    if (customerError || !customer) {
      return new Response(
        JSON.stringify({ error: 'Cliente não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get active subscription from DB (fallback)
    const { data: dbSubscription } = await supabase
      .from('subscriptions')
      .select('plan_id, status, current_period_start, current_period_end')
      .eq('customer_id', customer.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Try to resolve subscription status directly from Stripe
    let finalSubscription = dbSubscription as
      | { plan_id: string; status: string; current_period_start: string; current_period_end: string }
      | null;

    try {
      const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
      if (stripeKey && customer.email) {
        const stripe = new Stripe(stripeKey, { apiVersion: '2025-08-27.basil' });
        const stripeCustomers = await stripe.customers.list({ email: customer.email, limit: 1 });
        if (stripeCustomers.data.length > 0) {
          const stripeCustomerId = stripeCustomers.data[0].id;
          const subs = await stripe.subscriptions.list({ customer: stripeCustomerId, status: 'active', limit: 1 });
          if (subs.data.length > 0) {
            const sub = subs.data[0];
            const priceId = sub.items.data[0]?.price?.id;
            let planId = 'free';
            if (priceId === 'price_1SMEgFFsSB8n8Az0aSBb70E7') {
              planId = 'premium';
            } else if (priceId) {
              planId = 'enterprise';
            }

            const startIso = sub.current_period_start ? new Date(sub.current_period_start * 1000).toISOString() : new Date().toISOString();
            const endIso = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : new Date(Date.now() + 30*24*60*60*1000).toISOString();

            finalSubscription = {
              plan_id: planId,
              status: sub.status || 'active',
              current_period_start: startIso,
              current_period_end: endIso,
            };
          }
        }
      }
    } catch (e) {
      console.log('[AUTH-SESSION] Stripe check failed', e);
    }

    // Get plan details based on the final subscription (Stripe preferred)
    let plan = null as any;
    if (finalSubscription) {
      const { data: planData } = await supabase
        .from('plans')
        .select('*')
        .eq('id', finalSubscription.plan_id)
        .single();
      plan = planData;
    }


    // Get current month usage
    const now = new Date();
    const periodYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const { data: usage } = await supabase
      .from('monthly_usage')
      .select('used_credits')
      .eq('customer_id', customer.id)
      .eq('period_ym', periodYm)
      .single();

    return new Response(
      JSON.stringify({
        customer: {
          id: customer.id,
          email: customer.email,
          name: customer.name,
          whatsapp_e164: customer.whatsapp_e164,
          avatar_url: customer.avatar_url,
          status: customer.status,
        },
        subscription: finalSubscription ? {
          plan_id: finalSubscription.plan_id,
          status: finalSubscription.status,
          current_period_start: finalSubscription.current_period_start,
          current_period_end: finalSubscription.current_period_end,
        } : null,
        plan: plan,
        usage: {
          used_credits: usage?.used_credits || 0,
          period_ym: periodYm,
        },
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
