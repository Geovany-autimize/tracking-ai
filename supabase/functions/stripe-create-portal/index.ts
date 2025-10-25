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

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { 'x-session-token': authHeader } },
    });

    const { data: { customer_id } } = await supabase.rpc('get_customer_id_from_request') as any;
    if (!customer_id) {
      throw new Error('Not authenticated');
    }

    const { returnUrl } = await req.json();

    // Buscar stripe customer
    const { data: customer } = await supabase
      .from('customers')
      .select('stripe_customer_id')
      .eq('id', customer_id)
      .single();

    if (!customer?.stripe_customer_id) {
      throw new Error('No Stripe customer found');
    }

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')!;
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Criar sessão do portal
    const session = await stripe.billingPortal.sessions.create({
      customer: customer.stripe_customer_id,
      return_url: returnUrl || `${req.headers.get('origin')}/dashboard/settings?tab=billing`,
    });

    console.log(`Portal session created for customer ${customer_id}`);

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Error creating portal session:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
