import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-token',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[BLING-OAUTH-START] Starting OAuth flow');

    // Obter Customer ID do token de sessão customizado
    const token = req.headers.get('x-session-token') || req.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      console.error('[BLING-OAUTH-START] No auth token provided');
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar customer_id da sessão
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('customer_id')
      .eq('token_jti', token)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (sessionError || !session) {
      console.error('[BLING-OAUTH-START] Invalid session:', sessionError);
      return new Response(
        JSON.stringify({ error: 'Sessão inválida' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const customerId = session.customer_id;
    console.log('[BLING-OAUTH-START] Customer authenticated:', customerId);

    // Obter credenciais do Bling
    const clientId = Deno.env.get('BLING_CLIENT_ID');
    const redirectUri = `${supabaseUrl}/functions/v1/bling-oauth-callback`;

    if (!clientId) {
      console.error('[BLING-OAUTH-START] BLING_CLIENT_ID not configured');
      return new Response(
        JSON.stringify({ error: 'Integração não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Gerar state único para segurança (armazena o customer_id)
    const state = `${customerId}:${crypto.randomUUID()}`;

    // Construir URL de autorização do Bling
    const authUrl = new URL('https://www.bling.com.br/Api/v3/oauth/authorize');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('state', state);

    console.log('[BLING-OAUTH-START] Redirecting to Bling OAuth:', authUrl.toString());

    return new Response(
      JSON.stringify({ authUrl: authUrl.toString() }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('[BLING-OAUTH-START] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro ao iniciar autenticação' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});