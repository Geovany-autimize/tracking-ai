import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useStripeCheckout() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const createCheckoutSession = async (priceId?: string) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('session_token');
      if (!token) {
        throw new Error('Você precisa estar logado para continuar');
      }

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: priceId ? { price_id: priceId } : {},
        headers: {
          'x-session-token': token,
        },
      });

      if (error) throw error;

      if (data?.url) {
        // Open checkout in new tab
        window.open(data.url, '_blank');
      } else {
        throw new Error('URL de checkout não foi retornada');
      }
    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      toast({
        title: 'Erro ao criar sessão de pagamento',
        description: error.message || 'Tente novamente mais tarde',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openCustomerPortal = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('session_token');
      if (!token) {
        throw new Error('Você precisa estar logado para continuar');
      }

      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          'x-session-token': token,
        },
      });

      if (error) throw error;

      if (data?.url) {
        // Open portal in new tab
        window.open(data.url, '_blank');
      } else {
        throw new Error('URL do portal não foi retornada');
      }
    } catch (error: any) {
      console.error('Error opening customer portal:', error);
      toast({
        title: 'Erro ao abrir portal do cliente',
        description: error.message || 'Tente novamente mais tarde',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    createCheckoutSession,
    openCustomerPortal,
    isLoading,
  };
}
