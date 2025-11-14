import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Remove trailing slash do baseUrl para evitar // nas URLs
const normalizeBaseUrl = (url: string) => url.replace(/\/$/, '');

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
      // Redirecionar para página de integração Bling com erro
      const baseUrl = normalizeBaseUrl(Deno.env.get('APP_URL') || 'https://pvnwcxfnazwqpfasuztv.lovableproject.com');
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `${baseUrl}/dashboard/settings/integrations/bling?error=${encodeURIComponent(error)}`
        }
      });
    }

    if (!code || !state) {
      console.error('[BLING-OAUTH-CALLBACK] Missing code or state');
      const baseUrl = normalizeBaseUrl(Deno.env.get('APP_URL') || 'https://pvnwcxfnazwqpfasuztv.lovableproject.com');
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `${baseUrl}/dashboard/settings/integrations/bling?error=invalid_params`
        }
      });
    }

    // Extrair customer_id do state
    const customerId = state.split(':')[0];
    console.log('[BLING-OAUTH-CALLBACK] Customer ID from state:', customerId);

    // Trocar code por access token
    const clientId = Deno.env.get('BLING_CLIENT_ID')!;
    const clientSecret = Deno.env.get('BLING_CLIENT_SECRET')!;
    
    // Criar Basic Auth header com base64
    const credentials = btoa(`${clientId}:${clientSecret}`);

    const tokenResponse = await fetch('https://api.bling.com.br/Api/v3/oauth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('[BLING-OAUTH-CALLBACK] Token exchange error:', errorText);
      const baseUrl = normalizeBaseUrl(Deno.env.get('APP_URL') || 'https://pvnwcxfnazwqpfasuztv.lovableproject.com');
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `${baseUrl}/dashboard/settings/integrations/bling?error=token_exchange_failed`
        }
      });
    }

    const tokenData = await tokenResponse.json();
    console.log('[BLING-OAUTH-CALLBACK] Token received successfully');
    console.log('[BLING-OAUTH-CALLBACK] Token data:', JSON.stringify(tokenData, null, 2));

    // Buscar informações do usuário/empresa autenticada
    let blingCompanyId = null;
    try {
      console.log('[BLING-OAUTH-CALLBACK] Fetching user info from Bling API');
      const userInfoResponse = await fetch('https://api.bling.com.br/Api/v3/usuarios/me', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Accept': 'application/json',
        },
      });

      if (userInfoResponse.ok) {
        const userInfo = await userInfoResponse.json();
        console.log('[BLING-OAUTH-CALLBACK] User info received:', JSON.stringify(userInfo, null, 2));
        
        // Tentar extrair o company_id de diferentes possíveis campos
        blingCompanyId = userInfo?.data?.id || userInfo?.id || userInfo?.empresa?.id || tokenData?.company_id;
        console.log('[BLING-OAUTH-CALLBACK] Extracted company_id:', blingCompanyId);
      } else {
        console.warn('[BLING-OAUTH-CALLBACK] Failed to fetch user info:', userInfoResponse.status);
      }
    } catch (userInfoError) {
      console.error('[BLING-OAUTH-CALLBACK] Error fetching user info:', userInfoError);
    }

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
          bling_company_id: blingCompanyId,
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
          bling_company_id: blingCompanyId,
          status: 'active',
        });

      if (insertError) {
        console.error('[BLING-OAUTH-CALLBACK] Error creating integration:', insertError);
      } else {
        console.log('[BLING-OAUTH-CALLBACK] Integration created successfully');
      }
    }

    // Iniciar sincronização automática em background
    console.log('[BLING-OAUTH-CALLBACK] Triggering automatic sync');
    try {
      const syncResponse = await supabase.functions.invoke('bling-sync-orders', {
        headers: {
          'x-customer-id': customerId,
        },
      });
      
      if (syncResponse.error) {
        console.error('[BLING-OAUTH-CALLBACK] Auto-sync failed:', syncResponse.error);
      } else {
        console.log('[BLING-OAUTH-CALLBACK] Auto-sync triggered successfully');
      }
    } catch (syncError) {
      console.error('[BLING-OAUTH-CALLBACK] Auto-sync error:', syncError);
    }

    // Redirecionar para página de settings com sucesso
    const baseUrl = normalizeBaseUrl(Deno.env.get('APP_URL') || 'https://pvnwcxfnazwqpfasuztv.lovableproject.com');
    return new Response(null, {
      status: 302,
      headers: {
        'Location': `${baseUrl}/dashboard/settings/integrations/bling?success=true`
      }
    });
  } catch (error) {
    console.error('[BLING-OAUTH-CALLBACK] Unexpected error:', error);
    const baseUrl = normalizeBaseUrl(Deno.env.get('APP_URL') || 'https://pvnwcxfnazwqpfasuztv.lovableproject.com');
    return new Response(null, {
      status: 302,
      headers: {
        'Location': `${baseUrl}/dashboard/settings/integrations/bling?error=unknown_error`
      }
    });
  }
});