import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export interface BlingOrderSummary {
  orderId: string;
  numero: string;
  data?: string;
  contatoNome: string;
  totalProdutos?: number;
  total: number;
  situacaoId: number;
  situacaoValor: number;
  situacao?: { id?: number; valor?: number; nome?: string };
  isTracked: boolean;
  raw: unknown;
}

interface BlingWebhookOrder {
  id: number;
  numero?: number | string;
  numeroLoja?: string;
  data?: string;
  dataSaida?: string;
  dataPrevista?: string;
  totalProdutos?: number;
  total?: number;
  contato?: {
    id?: number;
    nome?: string;
    tipoPessoa?: string;
    numeroDocumento?: string;
  };
  situacao?: {
    id?: number;
    valor?: number;
  };
  loja?: {
    id?: number;
  };
}

export function useBlingOrders() {
  const queryClient = useQueryClient();
  const { customer } = useAuth();

  // Fetch orders from Bling
  const { data: ordersData, isLoading, refetch, isFetching, dataUpdatedAt } = useQuery({
    queryKey: ['bling-orders', customer?.id],
    enabled: false,
    staleTime: 5 * 60 * 1000, // 5 minutes - dados considerados "frescos"
    gcTime: 10 * 60 * 1000, // 10 minutes - mantém em cache antes de limpar
    queryFn: async () => {
      if (!customer?.id) {
        throw new Error('Cliente não autenticado');
      }

      const response = await fetch('https://webhook-n8n.autimize.com.br/webhook/ec304f57-e075-4642-98ce-0e5035bc22c0', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer_id: customer.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Falha ao buscar pedidos do Bling');
      }

      const data = await response.json();
      
      // Processar resposta do webhook - desembrulhar estrutura aninhada
      let ordersArray: BlingWebhookOrder[] = [];
      
      // DEBUG: Log COMPLETO da estrutura recebida
      console.log('[useBlingOrders] 🔍 ===== INÍCIO DO PARSING =====');
      console.log('[useBlingOrders] 📊 Tipo raiz:', Array.isArray(data) ? 'Array' : typeof data);
      console.log('[useBlingOrders] 📏 Tamanho raiz:', Array.isArray(data) ? data.length : 'N/A');
      console.log('[useBlingOrders] 🔍 Estrutura completa (primeiros 2000 chars):', JSON.stringify(data).substring(0, 2000));
      
      if (Array.isArray(data) && data.length > 0) {
        console.log('[useBlingOrders] 🔸 Primeiro elemento tipo:', typeof data[0]);
        console.log('[useBlingOrders] 🔸 Tem data?', data[0]?.data ? 'SIM' : 'NÃO');
        if (data[0]?.data) {
          console.log('[useBlingOrders] 🔸 Tipo de data[0].data:', Array.isArray(data[0].data) ? 'Array' : typeof data[0].data);
          console.log('[useBlingOrders] 🔸 Tamanho de data[0].data:', Array.isArray(data[0].data) ? data[0].data.length : 'N/A');
          
          // Log dos primeiros itens dentro de data[0].data se for array
          if (Array.isArray(data[0].data) && data[0].data.length > 0) {
            console.log('[useBlingOrders] 🔍 Primeiro item em data[0].data:', JSON.stringify(data[0].data[0]).substring(0, 300));
            console.log('[useBlingOrders] 🔍 data[0].data[0] tem .data?', data[0].data[0]?.data ? 'SIM' : 'NÃO');
            if (data[0].data[0]?.data) {
              console.log('[useBlingOrders] 🔍 data[0].data[0].data.numero:', data[0].data[0].data.numero);
              console.log('[useBlingOrders] 🔍 data[0].data[0].data.id:', data[0].data[0].data.id);
            }
          }
        }
      }
      
      // CASO 0: { data: [{ data: {...} }, { data: {...} }] }
      // Objeto direto (sem array externo) com data como array de wrappers
      if (!Array.isArray(data) && data?.data && Array.isArray(data.data)) {
        console.log('[useBlingOrders] ✅ Estrutura direta de objeto com array interno detectada');
        console.log('[useBlingOrders] 📦 Itens no array:', data.data.length);
        ordersArray = data.data
          .map((item, index) => {
            console.log(`[useBlingOrders] 🔸 Item ${index + 1}:`, item?.data ? `Pedido #${item.data.numero || item.data.id}` : 'SEM DATA');
            return item?.data;
          })
          .filter(order => order && typeof order === 'object') as BlingWebhookOrder[];
        console.log(`[useBlingOrders] ✅ Total extraído: ${ordersArray.length} pedidos`);
        console.log('[useBlingOrders] 📋 Números dos pedidos:', ordersArray.map(o => o.numero).join(', '));
      }
      // CASO 1: [{ data: [{ data: {...} }, { data: {...} }] }]
      // Array externo com 1 elemento, que tem data como array de wrappers
      else if (Array.isArray(data) && data.length > 0 && data[0]?.data && Array.isArray(data[0].data)) {
        const firstItemData = data[0].data;
        console.log('[useBlingOrders] 🎯 CASO 1 ATIVADO!');
        console.log('[useBlingOrders] 🔎 firstItemData tipo:', Array.isArray(firstItemData) ? 'Array' : typeof firstItemData);
        console.log('[useBlingOrders] 🔎 firstItemData length:', firstItemData.length);
        
        // data[0].data é array de wrappers: [{ data: {...} }, { data: {...} }]
        console.log('[useBlingOrders] ✅ Estrutura aninhada detectada (array dentro de array)');
        console.log('[useBlingOrders] 📦 Itens no array aninhado:', firstItemData.length);
        
        // Log antes do .map()
        console.log('[useBlingOrders] 🔄 Iniciando .map() sobre', firstItemData.length, 'itens');
        
        const mappedItems = firstItemData.map((item, index) => {
          const orderData = item?.data;
          console.log(`[useBlingOrders] 🔸 Item ${index + 1}/${firstItemData.length}:`, {
            temData: !!orderData,
            numero: orderData?.numero,
            id: orderData?.id,
            tipo: typeof orderData
          });
          return orderData;
        });
        
        console.log('[useBlingOrders] 🔄 .map() concluído. Items mapeados:', mappedItems.length);
        console.log('[useBlingOrders] 🔍 Items mapeados (resumo):', mappedItems.map((o, i) => `${i+1}: ${o?.numero || o?.id || 'null'}`).join(', '));
        
        // Log antes do .filter()
        console.log('[useBlingOrders] 🔄 Iniciando .filter()');
        ordersArray = mappedItems.filter((order, index) => {
          const isValid = order && typeof order === 'object';
          if (!isValid) {
            console.log(`[useBlingOrders] ⚠️ Item ${index + 1} removido no filter:`, order);
          }
          return isValid;
        }) as BlingWebhookOrder[];
          
        console.log(`[useBlingOrders] ✅ Total extraído após .map().filter(): ${ordersArray.length} pedidos`);
        console.log('[useBlingOrders] 📋 Números dos pedidos finais:', ordersArray.map(o => o.numero).join(', '));
      }
      // CASO 2: [{ data: {...} }, { data: {...} }]
      // Array de wrappers simples
      else if (Array.isArray(data) && data.length > 0 && data[0]?.data && !Array.isArray(data[0].data)) {
        console.log('[useBlingOrders] 🎯 CASO 2 ATIVADO: Array de wrappers simples');
        ordersArray = data
          .map((item, index) => {
            console.log(`[useBlingOrders] 🔸 Item ${index + 1}:`, item?.data ? `Pedido #${item.data.numero || item.data.id}` : 'SEM DATA');
            return item?.data;
          })
          .filter(order => order && typeof order === 'object') as BlingWebhookOrder[];
        console.log(`[useBlingOrders] ✅ Extraídos ${ordersArray.length} pedidos`);
      }
      // CASO 3: [{ id: ..., numero: ... }, { id: ..., numero: ... }]
      // Array direto de pedidos (sem wrapper)
      else if (Array.isArray(data)) {
        console.log('[useBlingOrders] 🎯 CASO 3 ATIVADO: Estrutura direta');
        ordersArray = data;
      }
      // CASO 4: { data: { id: ..., numero: ... } }
      // Objeto único com wrapper
      else if (data?.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
        console.log('[useBlingOrders] 🎯 CASO 4 ATIVADO: Objeto único com wrapper');
        ordersArray = [data.data];
      }
      // CASO 5: { id: ..., numero: ... }
      // Objeto único sem wrapper
      else if (data && typeof data === 'object') {
        console.log('[useBlingOrders] 🎯 CASO 5 ATIVADO: Objeto único sem wrapper');
        ordersArray = [data];
      }

      if (!ordersArray.length) {
        console.warn('[useBlingOrders] ⚠️ Nenhum pedido encontrado na resposta');
        console.log('[useBlingOrders] 📄 Estrutura recebida:', JSON.stringify(data, null, 2).substring(0, 1000));
        return { orders: [] };
      }

      console.log('[useBlingOrders] ===== FIM DO PARSING =====');
      console.log(`[useBlingOrders] 🎯 RESULTADO FINAL: ${ordersArray.length} pedidos processados`);


      // Validar estrutura dos pedidos
      ordersArray = ordersArray.filter(order => {
        if (!order || typeof order !== 'object') {
          console.warn('[useBlingOrders] Item inválido ignorado:', order);
          return false;
        }
        // Verificar se tem ID - propriedade obrigatória
        if (!order.id) {
          console.warn('[useBlingOrders] Pedido sem ID ignorado:', order);
          return false;
        }
        return true;
      });

      console.log('[useBlingOrders] Pedidos válidos recebidos:', ordersArray.length);

      const token = localStorage.getItem('session_token');
      const { data: existingShipmentsData } = await supabase
        .from('shipments')
        .select('bling_order_id')
        .eq('customer_id', customer.id)
        .neq('bling_order_id', null);

      const alreadyTrackedOrderIds = new Set(
        (existingShipmentsData || [])
          .map(shipment => shipment.bling_order_id)
          .filter(Boolean)
          .map(String)
      );

      const normalizedOrders: BlingOrderSummary[] = ordersArray.map(order => {
        const orderId = String(order.id);
        // Garantir que valores numéricos sejam realmente números
        const total = order.total != null ? Number(order.total) : 0;
        const totalProdutos = order.totalProdutos != null ? Number(order.totalProdutos) : undefined;
        const situacaoId = order.situacao?.id != null ? Number(order.situacao.id) : 0;
        const situacaoValor = order.situacao?.valor != null ? Number(order.situacao.valor) : 0;
        
        // Usar 'numero' se disponível, senão 'numeroLoja', senão o ID
        const numeroDisplay = order.numero 
          ? String(order.numero) 
          : (order.numeroLoja ? String(order.numeroLoja) : orderId);
        
        return {
          id: orderId,
          orderId,
          numero: numeroDisplay,
          data: order.data || order.dataSaida,
          totalProdutos,
          total: isNaN(total) ? 0 : total,
          situacaoId: isNaN(situacaoId) ? 0 : situacaoId,
          situacaoValor: isNaN(situacaoValor) ? 0 : situacaoValor,
          situacao: order.situacao,
          contatoNome: order.contato?.nome || 'Cliente',
          isTracked: alreadyTrackedOrderIds.has(orderId),
          raw: order,
        };
      });

      console.log(`[useBlingOrders] 🎯 RESULTADO FINAL: ${normalizedOrders.length} pedidos processados`);
      if (normalizedOrders.length > 0) {
        console.log('[useBlingOrders] 📋 Pedidos finais:', normalizedOrders.map(o => `#${o.numero} (${o.isTracked ? 'JÁ RASTREADO' : 'disponível'})`).join(', '));
      }

      return { orders: normalizedOrders };
    },
    retry: false,
  });

  // Import selected orders
  const importOrdersMutation = useMutation({
    mutationFn: async (orderIds: string[]) => {
      const token = localStorage.getItem('session_token');
      
      // Show loading toast
      const loadingToast = toast.loading(`Importando ${orderIds.length} ${orderIds.length === 1 ? 'pedido' : 'pedidos'}...`);
      
      try {
        const { data, error } = await supabase.functions.invoke('bling-import-selected-orders', {
          body: { orderIds },
          headers: {
            'x-session-token': token || '',
          },
        });

        toast.dismiss(loadingToast);
        
        if (error) throw error;
        return data;
      } catch (error) {
        toast.dismiss(loadingToast);
        throw error;
      }
    },
    onSuccess: async (data) => {
      // Invalidar cache - React Query irá refetch automaticamente
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['bling-orders', customer?.id] }),
        queryClient.invalidateQueries({ queryKey: ['shipments'] }),
      ]);
      
      if (data.imported > 0) {
        toast.success(
          `✅ ${data.imported} ${data.imported === 1 ? 'pedido importado' : 'pedidos importados'} com sucesso!`,
          { duration: 5000 }
        );
      }
      
      if (data.failed > 0) {
        const errorMessages = data.errors?.slice(0, 3).join('\n• ') || '';
        toast.error(
          `❌ ${data.failed} ${data.failed === 1 ? 'pedido falhou' : 'pedidos falharam'}${errorMessages ? `:\n• ${errorMessages}` : ''}`,
          { duration: 10000 }
        );
      }
      
      if (data.imported === 0 && data.failed === 0) {
        toast.info('Nenhum pedido foi importado', { duration: 5000 });
      }
    },
    onError: (error) => {
      console.error('Import orders error:', error);
      toast.error('Erro ao importar pedidos. Tente novamente.');
    },
  });

  return {
    orders: (ordersData?.orders || []) as BlingOrderSummary[],
    isLoading,
    isFetching,
    refetch,
    importOrders: (orderIds: string[]) => importOrdersMutation.mutate(orderIds),
    isImporting: importOrdersMutation.isPending,
    lastUpdated: dataUpdatedAt,
  };
}
