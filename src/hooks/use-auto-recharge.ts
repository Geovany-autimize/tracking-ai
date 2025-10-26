import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AutoRechargeSettings {
  id: string;
  customer_id: string;
  enabled: boolean;
  min_credits_threshold: number;
  recharge_amount: number;
  stripe_payment_method_id: string | null;
  last_payment_method_details: {
    last4?: string;
    brand?: string;
    exp_month?: number;
    exp_year?: number;
  } | null;
  created_at: string;
  updated_at: string;
}

export const useAutoRecharge = () => {
  const [settings, setSettings] = useState<AutoRechargeSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('auto_recharge_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setSettings(data as AutoRechargeSettings);
    } catch (error) {
      console.error('Error fetching auto-recharge settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupPaymentMethod = async () => {
    try {
      setProcessing(true);
      const { data, error } = await supabase.functions.invoke('setup-auto-recharge');

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
        return data.sessionId;
      }
    } catch (error) {
      console.error('Error setting up payment method:', error);
      toast.error('Erro ao configurar método de pagamento');
      throw error;
    } finally {
      setProcessing(false);
    }
  };

  const confirmSetup = async (sessionId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('confirm-auto-recharge-setup', {
        body: { sessionId }
      });

      if (error) throw error;

      await fetchSettings();
      toast.success('Método de pagamento configurado com sucesso!');
      return data;
    } catch (error) {
      console.error('Error confirming setup:', error);
      toast.error('Erro ao confirmar configuração');
      throw error;
    }
  };

  const updateSettings = async (updates: Partial<Pick<AutoRechargeSettings, 'enabled' | 'min_credits_threshold' | 'recharge_amount'>>) => {
    try {
      setProcessing(true);
      const { data, error } = await supabase.functions.invoke('update-auto-recharge-settings', {
        body: updates
      });

      if (error) throw error;

      await fetchSettings();
      toast.success('Configurações atualizadas com sucesso!');
      return data;
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Erro ao atualizar configurações');
      throw error;
    } finally {
      setProcessing(false);
    }
  };

  const removePaymentMethod = async () => {
    try {
      setProcessing(true);
      const { error } = await supabase.functions.invoke('remove-auto-recharge-payment');

      if (error) throw error;

      await fetchSettings();
      toast.success('Método de pagamento removido com sucesso!');
    } catch (error) {
      console.error('Error removing payment method:', error);
      toast.error('Erro ao remover método de pagamento');
      throw error;
    } finally {
      setProcessing(false);
    }
  };

  const toggleEnabled = async (enabled: boolean) => {
    return updateSettings({ enabled });
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return {
    settings,
    loading,
    processing,
    setupPaymentMethod,
    confirmSetup,
    updateSettings,
    removePaymentMethod,
    toggleEnabled,
    refetch: fetchSettings,
  };
};
