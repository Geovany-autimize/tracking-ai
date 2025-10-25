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

    const { packageId, successUrl, cancelUrl } = await req.json();

    if (!packageId) {
      throw new Error('packageId is required');
    }

    // Buscar informações do pacote
    const { data: creditPackage, error: packageError } = await supabase
      .from('credit_packages')
      .select('*')
      .eq('id', packageId)
      .single();

    if (packageError || !creditPackage) {
      throw new Error('Package not found');
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

    // Criar sessão de checkout
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'brl',
            product_data: {
              name: creditPackage.name,
              description: `${creditPackage.credits} créditos para rastreamento`,
            },
            unit_amount: creditPackage.price_cents,
          },
          quantity: 1,
        },
      ],
      success_url: successUrl || `${req.headers.get('origin')}/dashboard/settings?tab=billing&success=true`,
      cancel_url: cancelUrl || `${req.headers.get('origin')}/dashboard/settings?tab=billing`,
      metadata: {
        customer_id,
        type: 'credit_purchase',
        credits: creditPackage.credits.toString(),
        description: `Compra de ${creditPackage.name}`,
      },
    });

    console.log(`Checkout session created: ${session.id} for customer ${customer_id}`);

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Error creating checkout:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
