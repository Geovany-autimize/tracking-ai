import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import bcrypt from "https://esm.sh/bcryptjs@2.4.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { sanitizeError, checkRateLimit } from "../_shared/error-utils.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    // Rate limiting - 3 signups per 60 minutes per IP
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const rateLimitCheck = await checkRateLimit(supabase, `signup:${clientIp}`, 3, 60);

    if (!rateLimitCheck.allowed) {
      const minutesLeft = rateLimitCheck.lockedUntil 
        ? Math.ceil((rateLimitCheck.lockedUntil.getTime() - Date.now()) / 60000)
        : 60;
      
      return new Response(
        JSON.stringify({ 
          error: `Muitas tentativas. Tente novamente em ${minutesLeft} minutos.`,
          requestId
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();

    // Validate inputs with Zod
    const signupSchema = z.object({
      name: z.string().min(2, 'Nome muito curto').max(100, 'Nome muito longo'),
      email: z.string().email('Email inválido').max(255, 'Email muito longo'),
      password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres').max(128, 'Senha muito longa'),
      whatsapp_e164: z.string().regex(/^\+[1-9]\d{1,14}$/, 'WhatsApp inválido. Use o formato internacional (+55 11 99999-9999)'),
      plan: z.enum(['free', 'premium']).optional().default('free'),
    });

    const validation = signupSchema.safeParse(body);
    
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      return new Response(
        JSON.stringify({ error: firstError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { name, email, whatsapp_e164, password, plan } = validation.data;
    const planId = plan;

    // Check if email already exists
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (existingCustomer) {
      return new Response(
        JSON.stringify({ error: 'Este e-mail já está cadastrado' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

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

    // Create session token - 7 days validity (reduced from 30 for security)
    const sessionToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

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
    const sanitized = sanitizeError(error, requestId);
    return new Response(
      JSON.stringify(sanitized),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
