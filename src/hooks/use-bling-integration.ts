import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BlingIntegration {
  id: string;
  customer_id: string;
  status: 'active' | 'inactive' | 'error';
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SyncLog {
  id: string;
  customer_id: string;
  integration_id: string;
  sync_type: 'manual' | 'auto';
  status: 'success' | 'partial' | 'error';
  orders_imported: number;
  orders_updated: number;
  orders_failed: number;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

export function useBlingIntegration() {
  const queryClient = useQueryClient();

  // Buscar integração ativa
  const { data: integration, isLoading: isLoadingIntegration } = useQuery({
    queryKey: ['bling-integration'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bling_integrations')
        .select('*')
        .eq('status', 'active')
        .maybeSingle();

      if (error) throw error;
      return data as BlingIntegration | null;
    },
  });

  // Buscar logs de sincronização
  const { data: syncLogs, isLoading: isLoadingLogs } = useQuery({
    queryKey: ['bling-sync-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bling_sync_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as SyncLog[];
    },
    enabled: !!integration,
  });

  // Iniciar OAuth
  const startOAuthMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('session_token');
      
      const { data, error } = await supabase.functions.invoke('bling-oauth-start', {
        headers: {
          'x-session-token': token || '',
        },
      });

      if (error) throw error;
      if (!data?.authUrl) throw new Error('URL de autorização não recebida');
      
      // Redirecionar imediatamente para a URL do Bling
      window.location.href = data.authUrl;
      
      return data;
    },
    onSuccess: () => {
      // Redirecionamento já aconteceu no mutationFn
    },
    onError: (error) => {
      console.error('OAuth start error:', error);
      toast.error('Erro ao iniciar autenticação com Bling');
    },
  });

  // Sincronizar pedidos
  const syncOrdersMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('session_token');
      
      const response = await supabase.functions.invoke('bling-sync-orders', {
        headers: {
          'x-session-token': token || '',
        },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bling-sync-logs'] });
      queryClient.invalidateQueries({ queryKey: ['bling-integration'] });
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      
      if (data?.success) {
        toast.success(
          `Sincronização concluída! ${data.imported} importados, ${data.updated} atualizados${
            data.failed > 0 ? `, ${data.failed} falharam` : ''
          }`
        );
      }
    },
    onError: (error) => {
      console.error('Sync error:', error);
      toast.error('Erro ao sincronizar pedidos do Bling');
    },
  });

  // Desconectar integração
  const disconnectMutation = useMutation({
    mutationFn: async () => {
      if (!integration) throw new Error('No integration found');

      const { error } = await supabase
        .from('bling_integrations')
        .update({ status: 'inactive' })
        .eq('id', integration.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bling-integration'] });
      toast.success('Integração desconectada com sucesso');
    },
    onError: (error) => {
      console.error('Disconnect error:', error);
      toast.error('Erro ao desconectar integração');
    },
  });

  return {
    integration,
    syncLogs,
    isLoadingIntegration,
    isLoadingLogs,
    isConnected: !!integration,
    startOAuth: () => startOAuthMutation.mutate(),
    syncOrders: () => syncOrdersMutation.mutate(),
    disconnect: () => disconnectMutation.mutate(),
    isSyncing: syncOrdersMutation.isPending,
    isDisconnecting: disconnectMutation.isPending,
  };
}