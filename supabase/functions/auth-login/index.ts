import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import bcrypt from "https://esm.sh/bcryptjs@2.4.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

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
    const body = await req.json();

    // Validate inputs with Zod
    const loginSchema = z.object({
      email: z.string().email('Email inválido').max(255, 'Email muito longo'),
      password: z.string().min(1, 'Senha é obrigatória').max(128, 'Senha muito longa'),
    });

    const validation = loginSchema.safeParse(body);
    
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      return new Response(
        JSON.stringify({ error: firstError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { email, password } = validation.data;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get customer
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, email, name, status')
      .eq('email', email.toLowerCase())
      .single();

    if (customerError || !customer) {
      return new Response(
        JSON.stringify({ error: 'E-mail ou senha incorretos' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (customer.status === 'blocked') {
      return new Response(
        JSON.stringify({ error: 'Conta bloqueada. Entre em contato com o suporte.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get password hash
    const { data: credentials, error: credentialsError } = await supabase
      .from('password_credentials')
      .select('password_hash')
      .eq('customer_id', customer.id)
      .single();

    if (credentialsError || !credentials) {
      return new Response(
        JSON.stringify({ error: 'E-mail ou senha incorretos' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, credentials.password_hash);
    if (!isValidPassword) {
      return new Response(
        JSON.stringify({ error: 'E-mail ou senha incorretos' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
    console.error('Error in auth-login:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
