import { useState, useEffect, useRef } from 'react';
import { sendToTrackingAPI, TrackingAPIError } from '@/lib/tracking-api';
import { toast } from '@/hooks/use-toast';

const REFRESH_COOLDOWN_MS = 3000; // 3 segundos

export interface UseTrackingRefreshReturn {
  /** Se pode fazer refresh agora (não está em cooldown) */
  canRefresh: boolean;
  
  /** Segundos até poder fazer refresh novamente (0 se pode) */
  timeUntilNextRefresh: number;
  
  /** Função para atualizar rastreio */
  refreshTracking: (trackingCode: string, trackerId?: string) => Promise<void>;
  
  /** Se está processando requisição */
  isRefreshing: boolean;
}

export interface UseTrackingRefreshOptions {
  onSuccess?: (data: any) => void;
}

/**
 * Hook para gerenciar atualização manual de rastreios
 * Implementa throttle de 3 segundos entre requisições
 */
export function useTrackingRefresh(
  userId?: string,
  options?: UseTrackingRefreshOptions
): UseTrackingRefreshReturn {
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(0);
  const [timeUntilNext, setTimeUntilNext] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Calcular tempo restante até próximo refresh
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    if (lastRefreshTime > 0) {
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - lastRefreshTime;
        const remaining = Math.max(0, REFRESH_COOLDOWN_MS - elapsed);
        
        setTimeUntilNext(Math.ceil(remaining / 1000));

        if (remaining === 0) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
        }
      }, 100);
    } else {
      setTimeUntilNext(0);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [lastRefreshTime]);

  const canRefresh = timeUntilNext === 0 && !isRefreshing;

  const refreshTracking = async (trackingCode: string, trackerId?: string) => {
    if (!userId) {
      toast({
        title: 'Erro',
        description: 'Usuário não autenticado',
        variant: 'destructive',
      });
      return;
    }

    if (!canRefresh) {
      toast({
        title: 'Aguarde',
        description: `Aguarde ${timeUntilNext}s antes de atualizar novamente`,
      });
      return;
    }

    setIsRefreshing(true);
    setLastRefreshTime(Date.now());

    try {
      const response = await sendToTrackingAPI(userId, trackingCode, 'atualization', trackerId);
      
      toast({
        title: 'Rastreio atualizado',
        description: 'Status consultado com sucesso',
      });

      // Chamar callback de sucesso se fornecido
      if (options?.onSuccess && response.data) {
        options.onSuccess(response.data);
      }
    } catch (error) {
      console.error('Refresh error:', error);
      
      toast({
        title: 'Erro ao atualizar',
        description: error instanceof TrackingAPIError 
          ? error.message 
          : 'Tente novamente em alguns instantes',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return {
    canRefresh,
    timeUntilNextRefresh: timeUntilNext,
    refreshTracking,
    isRefreshing,
  };
}
