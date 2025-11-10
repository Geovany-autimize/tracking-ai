import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BlingOrder {
  id: string;
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
  codigoRastreamento?: string;
  isTracked: boolean;
  fullData: any;
}

export function useBlingOrders() {
  const queryClient = useQueryClient();

  // Fetch orders from Bling
  const { data: ordersData, isLoading, refetch } = useQuery({
    queryKey: ['bling-orders'],
    queryFn: async () => {
      const token = localStorage.getItem('session_token');
      
      const { data, error } = await supabase.functions.invoke('bling-fetch-orders', {
        headers: {
          'x-session-token': token || '',
        },
      });

      if (error) throw error;
      return data;
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
    refetch,
    importOrders: (orderIds: string[]) => importOrdersMutation.mutate(orderIds),
    isImporting: importOrdersMutation.isPending,
  };
}
