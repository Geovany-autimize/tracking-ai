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
    console.log('[BLING-SYNC-ORDERS] Starting order sync');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Helper function to check if token needs refresh
    const needsTokenRefresh = (expiresAt: string): boolean => {
      const expirationDate = new Date(expiresAt);
      const now = new Date();
      // Refresh if token expires in less than 30 minutes
      const thirtyMinutes = 30 * 60 * 1000;
      return (expirationDate.getTime() - now.getTime()) < thirtyMinutes;
    };

    // Tentar obter customer_id de diferentes fontes
    let customerId: string | null = null;

    // Opção 1: Via header direto (usado pelo callback)
    const directCustomerId = req.headers.get('x-customer-id');
    if (directCustomerId) {
      customerId = directCustomerId;
      console.log('[BLING-SYNC-ORDERS] Customer ID from header:', customerId);
    }

    // Opção 2: Via sessão (usado pelo frontend)
    if (!customerId) {
      const token = req.headers.get('x-session-token') || req.headers.get('authorization')?.replace('Bearer ', '');
      if (token) {
        const { data: session } = await supabase
          .from('sessions')
          .select('customer_id')
          .eq('token_jti', token)
          .gt('expires_at', new Date().toISOString())
          .single();
        
        customerId = session?.customer_id || null;
        if (customerId) {
          console.log('[BLING-SYNC-ORDERS] Customer ID from session:', customerId);
        }
      }
    }

    if (!customerId) {
      console.error('[BLING-SYNC-ORDERS] No customer_id found');
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar integração ativa do Bling
    const { data: integration, error: integrationError } = await supabase
      .from('bling_integrations')
      .select('*')
      .eq('customer_id', customerId)
      .eq('status', 'active')
      .single();

    if (integrationError || !integration) {
      console.error('[BLING-SYNC-ORDERS] No active integration found');
      return new Response(
        JSON.stringify({ error: 'Integração não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[BLING-SYNC-ORDERS] Found integration:', integration.id);

    // Check if token needs refresh
    if (needsTokenRefresh(integration.token_expires_at)) {
      console.log('[BLING-SYNC-ORDERS] Token expired or expiring soon, refreshing...');
      
      try {
        const refreshResponse = await supabase.functions.invoke('bling-refresh-token', {
          headers: {
            'x-customer-id': customerId,
          },
        });

        if (refreshResponse.error) {
          console.error('[BLING-SYNC-ORDERS] Token refresh failed:', refreshResponse.error);
          
          // If refresh failed due to invalid refresh token, return error
          if (refreshResponse.data?.needsReconnect) {
            return new Response(
              JSON.stringify({ 
                error: 'Token expirado. Reconexão necessária.',
                needsReconnect: true 
              }),
              { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          throw new Error('Token refresh failed');
        }

        console.log('[BLING-SYNC-ORDERS] Token refreshed successfully');
        
        // Fetch updated integration with new token
        const { data: updatedIntegration } = await supabase
          .from('bling_integrations')
          .select('*')
          .eq('id', integration.id)
          .single();
        
        if (updatedIntegration) {
          integration.access_token = updatedIntegration.access_token;
          integration.token_expires_at = updatedIntegration.token_expires_at;
        }
      } catch (refreshError) {
        console.error('[BLING-SYNC-ORDERS] Error during token refresh:', refreshError);
        return new Response(
          JSON.stringify({ error: 'Erro ao renovar token' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Criar log de sincronização
    const { data: syncLog, error: logError } = await supabase
      .from('bling_sync_logs')
      .insert({
        customer_id: customerId,
        integration_id: integration.id,
        sync_type: 'manual',
        status: 'success',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (logError) {
      console.error('[BLING-SYNC-ORDERS] Error creating sync log:', logError);
    }

    let ordersImported = 0;
    let ordersUpdated = 0;
    let ordersFailed = 0;
    const errors: string[] = [];

    try {
      // Buscar pedidos do Bling
      console.log('[BLING-SYNC-ORDERS] Fetching orders from Bling API');
      const ordersResponse = await fetch('https://api.bling.com.br/Api/v3/pedidos/vendas?pagina=1&limite=100', {
        headers: {
          'Authorization': `Bearer ${integration.access_token}`,
          'Accept': 'application/json',
        },
      });

      // Detectar token revogado (401)
      if (ordersResponse.status === 401) {
        console.error('[BLING-SYNC-ORDERS] Token revoked or invalid (401)');
        
        // Marcar integração como erro
        await supabase
          .from('bling_integrations')
          .update({ status: 'error' })
          .eq('id', integration.id);
        
        // Atualizar log com erro específico
        if (syncLog) {
          await supabase
            .from('bling_sync_logs')
            .update({
              status: 'error',
              error_message: 'Token de autorização revogado ou inválido. Por favor, reconecte a integração.',
              completed_at: new Date().toISOString(),
            })
            .eq('id', syncLog.id);
        }
        
        return new Response(
          JSON.stringify({ 
            error: 'Token revogado', 
            details: 'A autorização foi revogada. Por favor, reconecte a integração com o Bling.',
            needsReconnect: true
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!ordersResponse.ok) {
        throw new Error(`Bling API error: ${ordersResponse.status}`);
      }

      const ordersData = await ordersResponse.json();
      console.log('[BLING-SYNC-ORDERS] Orders fetched:', ordersData.data?.length || 0);

      // Processar cada pedido
      for (const order of ordersData.data || []) {
        try {
          // Verificar se o pedido tem código de rastreio
          if (!order.transporte?.codigoRastreamento) {
            console.log(`[BLING-SYNC-ORDERS] Order ${order.numero} has no tracking code, skipping`);
            continue;
          }

          const trackingCode = order.transporte.codigoRastreamento;

          // Verificar se já existe shipment com esse tracking_code
          const { data: existingShipment } = await supabase
            .from('shipments')
            .select('id')
            .eq('customer_id', customerId)
            .eq('tracking_code', trackingCode)
            .single();

          if (existingShipment) {
            // Atualizar shipment existente
            const { error: updateError } = await supabase
              .from('shipments')
              .update({
                shipment_data: order,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingShipment.id);

            if (updateError) {
              console.error(`[BLING-SYNC-ORDERS] Error updating shipment for order ${order.numero}:`, updateError);
              ordersFailed++;
              errors.push(`Erro ao atualizar pedido ${order.numero}`);
            } else {
              ordersUpdated++;
              console.log(`[BLING-SYNC-ORDERS] Updated shipment for order ${order.numero}`);
            }
          } else {
            // Criar novo shipment_customer se necessário
            let shipmentCustomerId = null;
            if (order.contato) {
              const { data: newCustomer, error: customerError } = await supabase
                .from('shipment_customers')
                .insert({
                  customer_id: customerId,
                  first_name: order.contato.nome?.split(' ')[0] || '',
                  last_name: order.contato.nome?.split(' ').slice(1).join(' ') || '',
                  email: order.contato.email || '',
                  phone: order.contato.celular || order.contato.telefone || '',
                })
                .select('id')
                .single();

              if (!customerError && newCustomer) {
                shipmentCustomerId = newCustomer.id;
              }
            }

            // Criar novo shipment
            const { error: insertError } = await supabase
              .from('shipments')
              .insert({
                customer_id: customerId,
                tracking_code: trackingCode,
                shipment_customer_id: shipmentCustomerId,
                auto_tracking: true,
                status: 'pending',
                shipment_data: order,
              });

            if (insertError) {
              console.error(`[BLING-SYNC-ORDERS] Error creating shipment for order ${order.numero}:`, insertError);
              ordersFailed++;
              errors.push(`Erro ao criar pedido ${order.numero}`);
            } else {
              ordersImported++;
              console.log(`[BLING-SYNC-ORDERS] Created shipment for order ${order.numero}`);
            }
          }
        } catch (orderError) {
          console.error(`[BLING-SYNC-ORDERS] Error processing order ${order.numero}:`, orderError);
          ordersFailed++;
          errors.push(`Erro ao processar pedido ${order.numero}`);
        }
      }

      // Atualizar last_sync_at na integração
      await supabase
        .from('bling_integrations')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('id', integration.id);

    } catch (syncError) {
      console.error('[BLING-SYNC-ORDERS] Sync error:', syncError);
      const errorMessage = syncError instanceof Error ? syncError.message : 'Unknown error';
      
      // Atualizar log com erro
      if (syncLog) {
        await supabase
          .from('bling_sync_logs')
          .update({
            status: 'error',
            error_message: errorMessage,
            completed_at: new Date().toISOString(),
          })
          .eq('id', syncLog.id);
      }

      return new Response(
        JSON.stringify({ error: 'Erro ao sincronizar pedidos', details: errorMessage }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Atualizar log de sincronização com resultados
    if (syncLog) {
      await supabase
        .from('bling_sync_logs')
        .update({
          status: ordersFailed > 0 ? 'partial' : 'success',
          orders_imported: ordersImported,
          orders_updated: ordersUpdated,
          orders_failed: ordersFailed,
          error_message: errors.length > 0 ? errors.join(', ') : null,
          completed_at: new Date().toISOString(),
        })
        .eq('id', syncLog.id);
    }

    console.log('[BLING-SYNC-ORDERS] Sync completed:', {
      imported: ordersImported,
      updated: ordersUpdated,
      failed: ordersFailed,
    });

    return new Response(
      JSON.stringify({
        success: true,
        imported: ordersImported,
        updated: ordersUpdated,
        failed: ordersFailed,
        errors,
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('[BLING-SYNC-ORDERS] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro inesperado ao sincronizar' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});