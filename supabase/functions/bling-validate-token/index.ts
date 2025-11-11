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
    console.log('[BLING-VALIDATE-TOKEN] Starting token validation');

    const token = req.headers.get('x-session-token') || req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      console.error('[BLING-VALIDATE-TOKEN] No auth token provided');
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar sessão
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('customer_id')
      .eq('token_jti', token)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (sessionError || !session) {
      console.error('[BLING-VALIDATE-TOKEN] Invalid session:', sessionError);
      return new Response(
        JSON.stringify({ error: 'Sessão inválida' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar integração ativa
    const { data: integration, error: integrationError } = await supabase
      .from('bling_integrations')
      .select('*')
      .eq('customer_id', session.customer_id)
      .eq('status', 'active')
      .maybeSingle();

    if (integrationError) {
      console.error('[BLING-VALIDATE-TOKEN] Error fetching integration:', integrationError);
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar integração' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!integration) {
      console.log('[BLING-VALIDATE-TOKEN] No active integration found');
      return new Response(
        JSON.stringify({ valid: false, error: 'Integração não encontrada' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fazer uma chamada leve ao Bling para validar token
    console.log('[BLING-VALIDATE-TOKEN] Testing token with Bling API');
    const validationResponse = await fetch('https://api.bling.com.br/Api/v3/situacoes/modulos', {
      headers: {
        'Authorization': `Bearer ${integration.access_token}`,
        'Accept': 'application/json',
      },
    });

    if (validationResponse.status === 401) {
      // Token is invalid or expired, try to refresh
      console.log('[BLING-VALIDATE-TOKEN] Token is invalid (401), attempting automatic refresh');
      
      try {
        const refreshResponse = await supabase.functions.invoke('bling-refresh-token', {
          headers: {
            'x-customer-id': session.customer_id,
          },
        });

        if (refreshResponse.error || refreshResponse.data?.needsReconnect) {
          console.log('[BLING-VALIDATE-TOKEN] Token refresh failed, marking as error');
          
          await supabase
            .from('bling_integrations')
            .update({ 
              status: 'error',
              updated_at: new Date().toISOString()
            })
            .eq('id', integration.id);

          return new Response(
            JSON.stringify({ 
              valid: false, 
              error: 'Token expirado. Reconexão necessária.',
              needsReconnect: true
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('[BLING-VALIDATE-TOKEN] Token refreshed successfully');
        return new Response(
          JSON.stringify({ 
            valid: true,
            refreshed: true,
            message: 'Token renovado automaticamente'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (refreshError) {
        console.error('[BLING-VALIDATE-TOKEN] Error during token refresh:', refreshError);
        
        await supabase
          .from('bling_integrations')
          .update({ 
            status: 'error',
            updated_at: new Date().toISOString()
          })
          .eq('id', integration.id);

        return new Response(
          JSON.stringify({ 
            valid: false, 
            error: 'Token revogado',
            needsReconnect: true
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log('[BLING-VALIDATE-TOKEN] Token is valid');
    return new Response(
      JSON.stringify({ valid: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[BLING-VALIDATE-TOKEN] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro ao validar token' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
