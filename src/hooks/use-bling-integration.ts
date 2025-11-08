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

  // Buscar integração ativa ou com erro
  const { data: integration, isLoading: isLoadingIntegration } = useQuery({
    queryKey: ['bling-integration'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bling_integrations')
        .select('*')
        .in('status', ['active', 'error'])
        .order('created_at', { ascending: false })
        .limit(1)
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
      
      // Timestamp de quando iniciou o OAuth
      const oauthStartTime = new Date().toISOString();
      console.log('[OAUTH-START] Starting OAuth at:', oauthStartTime);
      
      const { data, error } = await supabase.functions.invoke('bling-oauth-start', {
        headers: {
          'x-session-token': token || '',
        },
      });

      if (error) throw error;
      if (!data?.authUrl) throw new Error('URL de autorização não recebida');
      
      console.log('[OAUTH-START] Opening auth URL:', data.authUrl);
      window.open(data.authUrl, '_blank');
      
      // Iniciar polling para detectar quando conectar
      return new Promise<void>((resolve) => {
        const pollInterval = setInterval(async () => {
          // Verificar se já existe integração ativa criada após o início do OAuth
          const { data: integration } = await supabase
            .from('bling_integrations')
            .select('*')
            .eq('status', 'active')
            .gt('created_at', oauthStartTime)
            .maybeSingle();
          
          if (integration) {
            console.log('[POLLING] New integration detected:', integration.id);
            clearInterval(pollInterval);
            resolve();
          }
        }, 2000); // Verificar a cada 2 segundos
        
        // Timeout após 5 minutos
        setTimeout(() => {
          console.log('[POLLING] Timeout reached');
          clearInterval(pollInterval);
          resolve();
        }, 300000);
      });
    },
    onSuccess: () => {
      // Invalidar queries para atualizar UI
      queryClient.invalidateQueries({ queryKey: ['bling-integration'] });
      toast.success('Integração com Bling conectada com sucesso!');
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

  // Validar token
  const validateTokenMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('session_token');
      
      const { data, error } = await supabase.functions.invoke('bling-validate-token', {
        headers: {
          'x-session-token': token || '',
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (!data.valid && data.needsReconnect) {
        // Token foi revogado - invalidar cache para atualizar UI
        queryClient.invalidateQueries({ queryKey: ['bling-integration'] });
        toast.error('A autorização do Bling foi revogada. Por favor, reconecte.');
      }
    },
    onError: (error) => {
      console.error('Token validation error:', error);
    },
  });

  // Desconectar integração
  const disconnectMutation = useMutation({
    mutationFn: async () => {
      if (!integration) throw new Error('No integration found');

      console.log('[DISCONNECT] Attempting to delete integration:', integration.id);
      
      // Tentar deletar primeiro
      const { error: deleteError } = await supabase
        .from('bling_integrations')
        .delete()
        .eq('id', integration.id);

      if (deleteError) {
        console.error('[DISCONNECT] Delete failed, marking as inactive:', deleteError);
        
        // Se DELETE falhar, marcar como inactive e limpar tokens
        const { error: updateError } = await supabase
          .from('bling_integrations')
          .update({
            status: 'inactive',
            access_token: '',
            refresh_token: '',
          })
          .eq('id', integration.id);
        
        if (updateError) throw updateError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bling-integration'] });
      queryClient.invalidateQueries({ queryKey: ['bling-sync-logs'] });
      queryClient.resetQueries({ queryKey: ['bling-integration'] });
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
    isConnected: !!integration && integration.status === 'active',
    hasError: integration?.status === 'error',
    startOAuth: () => startOAuthMutation.mutate(),
    syncOrders: () => syncOrdersMutation.mutate(),
    disconnect: () => disconnectMutation.mutate(),
    validateToken: () => validateTokenMutation.mutate(),
    isSyncing: syncOrdersMutation.isPending,
    isDisconnecting: disconnectMutation.isPending,
    isValidating: validateTokenMutation.isPending,
  };
}