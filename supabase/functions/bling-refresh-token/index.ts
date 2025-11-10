import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-token',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[BLING-REFRESH-TOKEN] Starting token refresh process');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get customer_id from header or session token
    let customerId: string | null = null;

    const directCustomerId = req.headers.get('x-customer-id');
    if (directCustomerId) {
      customerId = directCustomerId;
      console.log('[BLING-REFRESH-TOKEN] Customer ID from header:', customerId);
    }

    if (!customerId) {
      const token = req.headers.get('x-session-token') || req.headers.get('authorization')?.replace('Bearer ', '');
      if (token) {
        const { data: session } = await supabase
          .from('sessions')
          .select('customer_id')
          .eq('token_jti', token)
          .gt('expires_at', new Date().toISOString())
          .single();
        
        customerId = session?.customer_id;
      }
    }

    if (!customerId) {
      console.error('[BLING-REFRESH-TOKEN] Customer ID not found');
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get active integration
    const { data: integration, error: integrationError } = await supabase
      .from('bling_integrations')
      .select('*')
      .eq('customer_id', customerId)
      .in('status', ['active', 'error'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (integrationError || !integration) {
      console.error('[BLING-REFRESH-TOKEN] No active integration found:', integrationError);
      return new Response(
        JSON.stringify({ error: 'Integração não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[BLING-REFRESH-TOKEN] Found integration:', integration.id);

    // Get Bling credentials from environment
    const clientId = Deno.env.get('BLING_CLIENT_ID');
    const clientSecret = Deno.env.get('BLING_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      console.error('[BLING-REFRESH-TOKEN] Missing Bling credentials in environment');
      return new Response(
        JSON.stringify({ error: 'Credenciais do Bling não configuradas' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare Basic Auth header
    const basicAuth = btoa(`${clientId}:${clientSecret}`);

    // Request new tokens using refresh_token
    console.log('[BLING-REFRESH-TOKEN] Requesting new access token');
    const tokenResponse = await fetch('https://bling.com.br/Api/v3/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${basicAuth}`,
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: integration.refresh_token,
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('[BLING-REFRESH-TOKEN] Token refresh failed:', tokenResponse.status, errorText);

      // If refresh token is invalid/expired, mark integration as error
      if (tokenResponse.status === 400 || tokenResponse.status === 401) {
        await supabase
          .from('bling_integrations')
          .update({ 
            status: 'error',
            updated_at: new Date().toISOString()
          })
          .eq('id', integration.id);

        return new Response(
          JSON.stringify({ 
            error: 'Refresh token inválido ou expirado. Reconexão necessária.',
            needsReconnect: true
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Erro ao renovar token' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tokenData = await tokenResponse.json();
    console.log('[BLING-REFRESH-TOKEN] Successfully obtained new tokens');

    // Calculate new expiration (Bling tokens expire in 6 hours)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 6);

    // Update integration with new tokens
    const { error: updateError } = await supabase
      .from('bling_integrations')
      .update({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token, // Bling may issue a new refresh token
        token_expires_at: expiresAt.toISOString(),
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', integration.id);

    if (updateError) {
      console.error('[BLING-REFRESH-TOKEN] Error updating integration:', updateError);
      return new Response(
        JSON.stringify({ error: 'Erro ao atualizar tokens' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[BLING-REFRESH-TOKEN] Integration updated successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Token renovado com sucesso',
        expiresAt: expiresAt.toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[BLING-REFRESH-TOKEN] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
