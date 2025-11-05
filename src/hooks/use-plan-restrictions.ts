import { useAuth } from '@/contexts/AuthContext';

export function usePlanRestrictions() {
  const { plan } = useAuth();
  
  const isPremiumFeature = (feature: 'extra_credits' | 'auto_recharge') => {
    return plan?.id === 'free';
  };
  
  const canBuyExtraCredits = plan?.id !== 'free';
  const canUseAutoRecharge = plan?.id !== 'free';
  const isFreePlan = plan?.id === 'free';
  
  return {
    canBuyExtraCredits,
    canUseAutoRecharge,
    isFreePlan,
    isPremiumFeature
  };
}
