import { createClient } from 'jsr:@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.21.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-token',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const authHeader = req.headers.get('x-session-token') || req.headers.get('authorization')?.replace('Bearer ', '');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Buscar customer_id diretamente da tabela sessions
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('customer_id')
      .eq('token_jti', authHeader)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (sessionError || !session?.customer_id) {
      throw new Error('Not authenticated');
    }

    const customer_id = session.customer_id;

    const { planId, successUrl, cancelUrl } = await req.json();

    if (!planId) {
      throw new Error('planId is required');
    }

    // Buscar informações do plano
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (planError || !plan) {
      throw new Error('Plan not found');
    }

    if (!plan.stripe_price_id) {
      throw new Error('Plan does not have a Stripe price ID configured');
    }

    // Buscar ou criar stripe customer
    const { data: customer } = await supabase
      .from('customers')
      .select('stripe_customer_id, email, name')
      .eq('id', customer_id)
      .single();

    if (!customer) {
      throw new Error('Customer not found');
    }

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')!;
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    let stripeCustomerId = customer.stripe_customer_id;

    if (!stripeCustomerId) {
      const stripeCustomer = await stripe.customers.create({
        email: customer.email,
        name: customer.name || undefined,
        metadata: { customer_id },
      });

      stripeCustomerId = stripeCustomer.id;

      await supabase
        .from('customers')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', customer_id);
    }

    // Criar sessão de checkout para assinatura
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      line_items: [
        {
          price: plan.stripe_price_id,
          quantity: 1,
        },
      ],
      success_url: successUrl || `${req.headers.get('origin')}/dashboard/settings?tab=billing&upgrade=success`,
      cancel_url: cancelUrl || `${req.headers.get('origin')}/dashboard/settings?tab=billing`,
      metadata: {
        customer_id,
        plan_id: planId,
        type: 'subscription',
      },
    });

    console.log(`Subscription checkout session created: ${session.id} for customer ${customer_id} - plan ${planId}`);

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Error creating subscription checkout:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
