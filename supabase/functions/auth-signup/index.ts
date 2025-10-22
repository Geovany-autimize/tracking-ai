import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, whatsapp_e164, password, plan } = await req.json();

    // Validate inputs
    if (!email || !password || !name) {
      return new Response(
        JSON.stringify({ error: 'Nome, email e senha são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (password.length < 8) {
      return new Response(
        JSON.stringify({ error: 'A senha deve ter pelo menos 8 caracteres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const planId = plan || 'free';
    if (!['free', 'premium'].includes(planId)) {
      return new Response(
        JSON.stringify({ error: 'Plano inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if email already exists
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existingCustomer) {
      return new Response(
        JSON.stringify({ error: 'Este e-mail já está cadastrado' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password);

    // Create customer
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .insert({
        email: email.toLowerCase(),
        name,
        whatsapp_e164,
        status: 'active',
      })
      .select()
      .single();

    if (customerError || !customer) {
      console.error('Error creating customer:', customerError);
      return new Response(
        JSON.stringify({ error: 'Erro ao criar conta' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Save password hash
    const { error: passwordError } = await supabase
      .from('password_credentials')
      .insert({
        customer_id: customer.id,
        password_hash: passwordHash,
      });

    if (passwordError) {
      console.error('Error saving password:', passwordError);
      // Rollback customer creation
      await supabase.from('customers').delete().eq('id', customer.id);
      return new Response(
        JSON.stringify({ error: 'Erro ao criar conta' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create subscription
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const { error: subscriptionError } = await supabase
      .from('subscriptions')
      .insert({
        customer_id: customer.id,
        plan_id: planId,
        status: planId === 'free' ? 'active' : 'pending',
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
      });

    if (subscriptionError) {
      console.error('Error creating subscription:', subscriptionError);
    }

    // Create initial monthly usage
    const periodYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    await supabase
      .from('monthly_usage')
      .insert({
        customer_id: customer.id,
        period_ym: periodYm,
        used_credits: 0,
      });

    // Create session token
    const sessionToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const { error: sessionError } = await supabase
      .from('sessions')
      .insert({
        customer_id: customer.id,
        token_jti: sessionToken,
        ip: req.headers.get('x-forwarded-for') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown',
        expires_at: expiresAt.toISOString(),
      });

    if (sessionError) {
      console.error('Error creating session:', sessionError);
      return new Response(
        JSON.stringify({ error: 'Erro ao criar sessão' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        customer: {
          id: customer.id,
          email: customer.email,
          name: customer.name,
        },
        sessionToken,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in auth-signup:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
