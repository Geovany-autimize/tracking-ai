import { useState, useEffect } from 'react';
import { getAvailableCredits, getUsedCredits, getTotalPurchasedCredits, getMonthlyUsedCredits } from '@/lib/credits';
import { useAuth } from '@/contexts/AuthContext';

export function useCredits() {
  const { customer, plan, subscription } = useAuth();
  const [availableCredits, setAvailableCredits] = useState<number | null>(null);
  const [usedCredits, setUsedCredits] = useState<number | null>(null);
  const [monthlyUsedCredits, setMonthlyUsedCredits] = useState<number | null>(null);
  const [totalPurchasedCredits, setTotalPurchasedCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    if (!customer?.id) {
      setAvailableCredits(null);
      setUsedCredits(null);
      setMonthlyUsedCredits(null);
      setTotalPurchasedCredits(null);
      return;
    }

    setLoading(true);
    try {
      const [available, used, monthlyUsed, totalPurchased] = await Promise.all([
        getAvailableCredits(customer.id, plan?.id),
        getUsedCredits(customer.id),
        getMonthlyUsedCredits(customer.id),
        getTotalPurchasedCredits(customer.id, plan?.id)
      ]);
      setAvailableCredits(available);
      setUsedCredits(used);
      setMonthlyUsedCredits(monthlyUsed);
      setTotalPurchasedCredits(totalPurchased);
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
  const totalUsed = usedCredits || 0;
  const monthlyUsed = subscription ? (monthlyUsedCredits || 0) : 0;
  const monthlyRemaining = Math.max(0, monthlyCredits - monthlyUsed);
  
  // Calcular créditos extras comprados
  const extraCreditsPurchased = totalPurchasedCredits ? Math.max(0, totalPurchasedCredits - monthlyCredits) : 0;
  
  // Total de créditos disponíveis = total adquirido - total usado
  const totalCreditsAvailable = totalPurchasedCredits ? Math.max(0, totalPurchasedCredits - totalUsed) : 0;

  return {
    // Valores totais
    totalCredits: totalCreditsAvailable, // Total adquirido menos total usado
    totalPurchasedCredits: totalPurchasedCredits || 0, // Total adquirido (plano + extras)
    totalUsed, // Total de créditos usados no período (mensais + extras)
    
    // Créditos mensais
    monthlyCredits,
    monthlyUsed,
    monthlyRemaining,
    
    // Créditos extras
    extraCredits: extraCreditsPurchased, // Total de créditos extras comprados
    
    // Estado
    loading,
    
    // Funções
    refresh
  };
}
