import { createClient } from 'jsr:@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.21.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      throw new Error('No signature provided');
    }

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')!;
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    console.log(`Received webhook event: ${event.type}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('Checkout session completed:', session.id);

        const customerId = session.metadata?.customer_id;
        const type = session.metadata?.type || 'credit_purchase';
        const creditsToAdd = session.metadata?.credits ? parseInt(session.metadata.credits) : 0;

        if (!customerId) {
          throw new Error('No customer_id in session metadata');
        }

        // Criar registro de transação
        const { error: txError } = await supabase
          .from('billing_transactions')
          .insert({
            customer_id: customerId,
            stripe_payment_intent_id: session.payment_intent as string,
            amount_cents: session.amount_total || 0,
            currency: session.currency || 'brl',
            status: 'succeeded',
            type,
            description: session.metadata?.description || 'Compra de créditos',
            credits_added: creditsToAdd,
            metadata: { session_id: session.id },
          });

        if (txError) {
          console.error('Error creating transaction:', txError);
          throw txError;
        }

        // Se for compra de créditos, adicionar ao saldo
        if (type === 'credit_purchase' && creditsToAdd > 0) {
          const { data: subscription } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('customer_id', customerId)
            .single();

          if (subscription) {
            const period = new Date().toISOString().slice(0, 7).replace('-', '');
            
            const { error: usageError } = await supabase
              .from('monthly_usage')
              .upsert({
                customer_id: customerId,
                period_ym: period,
                used_credits: -creditsToAdd, // Negativo para adicionar créditos
              }, {
                onConflict: 'customer_id,period_ym',
                ignoreDuplicates: false,
              });

            if (usageError) {
              console.error('Error updating usage:', usageError);
            }
          }
        }

        console.log(`Transaction completed for customer ${customerId}, ${creditsToAdd} credits added`);
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('Invoice paid:', invoice.id);

        const subscriptionId = invoice.subscription as string;
        if (subscriptionId) {
          const { error } = await supabase
            .from('subscriptions')
            .update({
              current_period_start: new Date(invoice.period_start * 1000).toISOString(),
              current_period_end: new Date(invoice.period_end * 1000).toISOString(),
            })
            .eq('stripe_subscription_id', subscriptionId);

          if (error) {
            console.error('Error updating subscription:', error);
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('Invoice payment failed:', invoice.id);

        const customerId = invoice.metadata?.customer_id;
        if (customerId) {
          await supabase.from('billing_transactions').insert({
            customer_id: customerId,
            stripe_invoice_id: invoice.id,
            amount_cents: invoice.amount_due,
            currency: invoice.currency,
            status: 'failed',
            type: 'subscription',
            description: 'Falha no pagamento da assinatura',
            metadata: { invoice_id: invoice.id },
          });
        }
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`Subscription ${event.type}:`, subscription.id);

        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: subscription.status === 'active' ? 'active' : 'inactive',
            cancel_at_period_end: subscription.cancel_at_period_end,
            canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
          })
          .eq('stripe_subscription_id', subscription.id);

        if (error) {
          console.error('Error updating subscription:', error);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Webhook error:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
