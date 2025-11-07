import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[BLING-OAUTH-CALLBACK] Callback received');

    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    if (error) {
      console.error('[BLING-OAUTH-CALLBACK] OAuth error:', error);
      // Redirecionar para página de settings com erro
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const projectId = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
      const baseUrl = `https://${projectId}.lovableproject.com`;
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `${baseUrl}/dashboard/settings?bling_error=${encodeURIComponent(error)}`
        }
      });
    }

    if (!code || !state) {
      console.error('[BLING-OAUTH-CALLBACK] Missing code or state');
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const projectId = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
      const baseUrl = `https://${projectId}.lovableproject.com`;
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `${baseUrl}/dashboard/settings?bling_error=invalid_params`
        }
      });
    }

    // Extrair customer_id do state
    const customerId = state.split(':')[0];
    console.log('[BLING-OAUTH-CALLBACK] Customer ID from state:', customerId);

    // Trocar code por access token
    const clientId = Deno.env.get('BLING_CLIENT_ID')!;
    const clientSecret = Deno.env.get('BLING_CLIENT_SECRET')!;
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/bling-oauth-callback`;

    const tokenResponse = await fetch('https://www.bling.com.br/Api/v3/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('[BLING-OAUTH-CALLBACK] Token exchange error:', errorText);
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const projectId = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
      const baseUrl = `https://${projectId}.lovableproject.com`;
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `${baseUrl}/dashboard/settings?bling_error=token_exchange_failed`
        }
      });
    }

    const tokenData = await tokenResponse.json();
    console.log('[BLING-OAUTH-CALLBACK] Token received successfully');

    // Calcular data de expiração
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expires_in);

    // Salvar tokens no banco
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verificar se já existe integração ativa
    const { data: existing } = await supabase
      .from('bling_integrations')
      .select('id')
      .eq('customer_id', customerId)
      .eq('status', 'active')
      .single();

    if (existing) {
      // Atualizar integração existente
      const { error: updateError } = await supabase
        .from('bling_integrations')
        .update({
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_expires_at: expiresAt.toISOString(),
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (updateError) {
        console.error('[BLING-OAUTH-CALLBACK] Error updating integration:', updateError);
      } else {
        console.log('[BLING-OAUTH-CALLBACK] Integration updated successfully');
      }
    } else {
      // Criar nova integração
      const { error: insertError } = await supabase
        .from('bling_integrations')
        .insert({
          customer_id: customerId,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_expires_at: expiresAt.toISOString(),
          status: 'active',
        });

      if (insertError) {
        console.error('[BLING-OAUTH-CALLBACK] Error creating integration:', insertError);
      } else {
        console.log('[BLING-OAUTH-CALLBACK] Integration created successfully');
      }
    }

    // Redirecionar para página de settings com sucesso
    const projectId = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
    const baseUrl = `https://${projectId}.lovableproject.com`;
    return new Response(null, {
      status: 302,
      headers: {
        'Location': `${baseUrl}/dashboard/settings/integrations/bling?success=true`
      }
    });
  } catch (error) {
    console.error('[BLING-OAUTH-CALLBACK] Unexpected error:', error);
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const projectIdErr = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
    const baseUrl = `https://${projectIdErr}.lovableproject.com`;
    return new Response(null, {
      status: 302,
      headers: {
        'Location': `${baseUrl}/dashboard/settings?bling_error=unknown_error`
      }
    });
  }
});