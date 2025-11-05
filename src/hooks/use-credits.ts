import { useState, useEffect } from 'react';
import { getAvailableCredits, getUsedCredits } from '@/lib/credits';
import { useAuth } from '@/contexts/AuthContext';

export function useCredits() {
  const { customer, plan, subscription } = useAuth();
  const [availableCredits, setAvailableCredits] = useState<number | null>(null);
  const [usedCredits, setUsedCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    if (!customer?.id) {
      setAvailableCredits(null);
      setUsedCredits(null);
      return;
    }

    setLoading(true);
    try {
      const [available, used] = await Promise.all([
        getAvailableCredits(customer.id),
        getUsedCredits(customer.id)
      ]);
      setAvailableCredits(available);
      setUsedCredits(used);
    } catch (error) {
      console.error('Error fetching credits:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [customer?.id, subscription?.current_period_start]);

  const monthlyCredits = plan?.monthly_credits || 0;
  const monthlyUsed = subscription ? usedCredits || 0 : 0;
  const monthlyRemaining = Math.max(0, monthlyCredits - monthlyUsed);
  const extraCredits = Math.max(0, (availableCredits || 0) - monthlyRemaining);

  return {
    // Valores totais
    totalCredits: availableCredits, // Créditos disponíveis (já descontados os usados)
    totalUsed: usedCredits, // Total de créditos usados no período
    
    // Créditos mensais
    monthlyCredits,
    monthlyUsed,
    monthlyRemaining,
    
    // Créditos extras
    extraCredits,
    
    // Estado
    loading,
    
    // Funções
    refresh
  };
}
