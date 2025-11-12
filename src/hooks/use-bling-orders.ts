import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export interface BlingOrder {
  id: string; // Composite: orderId-volumeId
  orderId: string; // Original order ID
  volumeId: string; // Volume/label ID
  volumeNumero: number; // Volume number (1, 2, 3...)
  totalVolumes: number; // Total volumes in order
  numero: string;
  data: string;
  valor: number;
  situacao: {
    id: number;
    valor: number;
    nome: string;
  };
  contato: {
    id: string;
    nome: string;
    email: string;
    telefone?: string;
    celular?: string;
  };
  transporte?: {
    codigoRastreamento?: string;
    transportador?: {
      nome: string;
    };
  };
  codigoRastreamento: string;
  isTracked: boolean;
  fullData: any;
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
      if (Array.isArray(data)) {
        return { orders: data };
      }
      if (Array.isArray(data?.orders)) {
        return { orders: data.orders };
      }

      console.warn('[useBlingOrders] Resposta inesperada do webhook', data);
      return { orders: [] };
    },
    retry: false,
  });

  // Import selected orders
  const importOrdersMutation = useMutation({
    mutationFn: async (orderIds: string[]) => {
      const token = localStorage.getItem('session_token');
      
      const { data, error } = await supabase.functions.invoke('bling-import-selected-orders', {
        body: { orderIds },
        headers: {
          'x-session-token': token || '',
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bling-orders'] });
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      
      if (data.imported > 0) {
        toast.success(
          `${data.imported} ${data.imported === 1 ? 'pedido importado' : 'pedidos importados'} com sucesso!`
        );
      }
      
      if (data.failed > 0) {
        toast.error(
          `${data.failed} ${data.failed === 1 ? 'pedido falhou' : 'pedidos falharam'}. ${data.errors?.[0] || ''}`
        );
      }
    },
    onError: (error) => {
      console.error('Import orders error:', error);
      toast.error('Erro ao importar pedidos');
    },
  });

  return {
    orders: (ordersData?.orders || []) as BlingOrder[],
    isLoading,
    isFetching,
    refetch,
    importOrders: (orderIds: string[]) => importOrdersMutation.mutate(orderIds),
    isImporting: importOrdersMutation.isPending,
  };
}
