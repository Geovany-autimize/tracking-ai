import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface BillingTransaction {
  id: string;
  customer_id: string;
  stripe_invoice_id: string | null;
  stripe_payment_intent_id: string | null;
  amount_cents: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed';
  type: 'subscription' | 'credit_purchase' | 'auto_topup';
  description: string | null;
  credits_added: number | null;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price_cents: number;
  stripe_price_id: string | null;
  discount_percentage: number | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

export interface AutoTopupSettings {
  customer_id: string;
  enabled: boolean;
  trigger_threshold: number;
  package_id: string | null;
  max_purchases_per_month: number;
  purchases_this_month: number;
  last_purchase_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useBilling() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar pacotes de créditos
  const { data: creditPackages, isLoading: isLoadingPackages } = useQuery({
    queryKey: ['credit-packages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('credit_packages')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      return data as CreditPackage[];
    },
  });

  // Buscar histórico de transações
  const { data: transactionsData, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['billing-history'],
    queryFn: async () => {
      const token = localStorage.getItem('session_token');
      const { data, error } = await supabase.functions.invoke('billing-get-history', {
        headers: { 'x-session-token': token || '' },
      });

      if (error) throw error;
      return data as { transactions: BillingTransaction[]; total: number };
    },
  });

  // Buscar configurações de auto top-up
  const { data: autoTopupSettings, isLoading: isLoadingAutoTopup } = useQuery({
    queryKey: ['auto-topup-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('auto_topup_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as AutoTopupSettings | null;
    },
  });

  // Criar checkout session
  const purchaseCredits = useMutation({
    mutationFn: async (packageId: string) => {
      const token = localStorage.getItem('session_token');
      const { data, error } = await supabase.functions.invoke('stripe-create-checkout', {
        body: { packageId },
        headers: { 'x-session-token': token || '' },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao processar pagamento',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Criar portal session
  const openBillingPortal = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('session_token');
      const { data, error } = await supabase.functions.invoke('stripe-create-portal', {
        body: {},
        headers: { 'x-session-token': token || '' },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao abrir portal',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Salvar configurações de auto top-up
  const saveAutoTopupSettings = useMutation({
    mutationFn: async (settings: { 
      customer_id: string; 
      enabled: boolean; 
      trigger_threshold: number;
      package_id: string | null;
      max_purchases_per_month: number;
    }) => {
      const { data, error } = await supabase
        .from('auto_topup_settings')
        .upsert([settings])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auto-topup-settings'] });
      toast({
        title: 'Configurações salvas',
        description: 'Suas configurações de recarga automática foram atualizadas.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao salvar configurações',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    creditPackages,
    isLoadingPackages,
    transactions: transactionsData?.transactions || [],
    totalTransactions: transactionsData?.total || 0,
    isLoadingHistory,
    autoTopupSettings,
    isLoadingAutoTopup,
    purchaseCredits: purchaseCredits.mutate,
    isPurchasing: purchaseCredits.isPending,
    openBillingPortal: openBillingPortal.mutate,
    isOpeningPortal: openBillingPortal.isPending,
    saveAutoTopupSettings: saveAutoTopupSettings.mutate,
    isSavingAutoTopup: saveAutoTopupSettings.isPending,
  };
}
