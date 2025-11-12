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
  const { data: ordersData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['bling-orders', customer?.id],
    enabled: false,
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

      const ordersArray: BlingWebhookOrder[] = Array.isArray(data)
        ? (data as BlingWebhookOrder[])
        : Array.isArray(data?.data)
        ? (data.data as BlingWebhookOrder[])
        : Array.isArray(data?.orders)
        ? (data.orders as BlingWebhookOrder[])
        : [];

      if (!ordersArray.length) {
        console.warn('[useBlingOrders] Resposta do webhook vazia ou inesperada', data);
        return { orders: [] };
      }

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
        return {
          id: orderId,
          orderId,
          numero: order.numero ? String(order.numero) : orderId,
          data: order.data,
          totalProdutos: order.totalProdutos,
          total: Number(order.total ?? 0),
          situacaoId: Number(order.situacao?.id ?? 0),
          situacaoValor: Number(order.situacao?.valor ?? 0),
          situacao: order.situacao,
          contatoNome: order.contato?.nome || 'Cliente',
          isTracked: alreadyTrackedOrderIds.has(orderId),
          raw: order,
        };
      });

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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bling-orders', customer?.id] });
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      
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
  };
}
