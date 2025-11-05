import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Customer {
  id: string;
  email: string;
  name: string;
  whatsapp_e164?: string;
  avatar_url?: string;
  status: string;
}

interface Subscription {
  plan_id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end?: boolean;
}

interface Plan {
  id: string;
  name: string;
  price_cents: number | null;
  monthly_credits: number | null;
  features: any;
}

interface AuthContextType {
  customer: Customer | null;
  subscription: Subscription | null;
  plan: Plan | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string, whatsapp?: string, plan?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  checkSubscription: () => Promise<void>;
  syncSubscriptionAndCredits: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const isSyncingRef = useRef(false);

  const getSessionToken = () => localStorage.getItem('session_token');
  const setSessionToken = (token: string) => localStorage.setItem('session_token', token);
  const clearSessionToken = () => localStorage.removeItem('session_token');

  const refreshSession = async () => {
    const token = getSessionToken();
    if (!token) {
      setCustomer(null);
      setSubscription(null);
      setPlan(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('auth-session');

      if (error || !data) {
        clearSessionToken();
        setCustomer(null);
        setSubscription(null);
        setPlan(null);
        return;
      }

      setCustomer(data.customer);
      setSubscription(data.subscription);
      setPlan(data.plan);
    } catch (error) {
      console.error('Error refreshing session:', error);
      clearSessionToken();
      setCustomer(null);
      setSubscription(null);
      setPlan(null);
    } finally {
      setLoading(false);
    }
  };

  // Centralized sync function that replicates the manual refresh button behavior
  const syncSubscriptionAndCredits = async () => {
    if (isSyncingRef.current) {
      console.log('[AUTH] Sync already in progress, skipping...');
      return;
    }

    const token = getSessionToken();
    if (!token) {
      console.log('[AUTH] No token available for sync');
      return;
    }

    isSyncingRef.current = true;
    try {
      console.log('[AUTH] Starting full subscription sync...');

      // 1. Populate Stripe IDs if needed (silent - won't error if already populated)
      await supabase.functions.invoke('populate-stripe-subscription-ids', {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('[AUTH] Step 1: Stripe IDs populated');

      // 2. Refresh subscription dates from Stripe
      await supabase.functions.invoke('refresh-subscription-dates', {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('[AUTH] Step 2: Subscription dates refreshed');

      // 3. Check subscription status and update local state
      await checkSubscription();
      console.log('[AUTH] Step 3: Subscription checked and state updated');

      console.log('[AUTH] Full subscription sync completed successfully');
    } catch (error) {
      console.error('[AUTH] Error in syncSubscriptionAndCredits:', error);
    } finally {
      isSyncingRef.current = false;
    }
  };

  useEffect(() => {
    const initialize = async () => {
      await refreshSession();
      // Full sync after session refresh
      const token = getSessionToken();
      if (token) {
        await syncSubscriptionAndCredits();
      }
    };
    initialize();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    
    const { data, error } = await supabase.functions.invoke('auth-login', {
      body: { email, password },
    });

    if (error || !data?.success) {
      setLoading(false);
      let message = 'Erro ao fazer login';
      if (data?.error) {
        message = data.error;
      } else if (error) {
        const raw = (error as any).message;
        if (typeof raw === 'string') {
          try {
            const parsed = JSON.parse(raw);
            message = parsed?.error || raw;
          } catch {
            message = raw || message;
          }
        }
      }
      throw new Error(message);
    }

    setSessionToken(data.sessionToken);
    await refreshSession();
    // Full sync after login
    await syncSubscriptionAndCredits();
  };

  const signup = async (
    name: string,
    email: string,
    password: string,
    whatsapp_e164?: string,
    plan?: string
  ) => {
    setLoading(true);
    
    const { data, error } = await supabase.functions.invoke('auth-signup', {
      body: { name, email, password, whatsapp_e164, plan },
    });

    if (error || !data?.success) {
      setLoading(false);
      let message = 'Erro ao criar conta';
      if (data?.error) {
        message = data.error;
      } else if (error) {
        const raw = (error as any).message;
        if (typeof raw === 'string') {
          try {
            const parsed = JSON.parse(raw);
            message = parsed?.error || raw;
          } catch {
            message = raw || message;
          }
        }
      }
      throw new Error(message);
    }

    setSessionToken(data.sessionToken);
    await refreshSession();
    // Full sync after signup
    await syncSubscriptionAndCredits();
  };

  const checkSubscription = async () => {
    const token = getSessionToken();
    if (!token) return;

    try {
      // Check subscription status with proper authorization
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (error || !data) {
        console.error('Error checking subscription:', error);
        return;
      }

      // Update subscription state with data from Stripe
      const updatedSubscription: Subscription = {
        plan_id: data.plan_id || 'free',
        status: data.subscribed ? 'active' : 'inactive',
        current_period_start: data.subscription_start || '',
        current_period_end: data.subscription_end || '',
        cancel_at_period_end: data.cancel_at_period_end || false,
      };
      setSubscription(updatedSubscription);

      // Fetch plan details if plan_id changed
      if (data.plan_id && (!plan || plan.id !== data.plan_id)) {
        const { data: planData, error: planError } = await supabase
          .from('plans')
          .select('*')
          .eq('id', data.plan_id)
          .single();

        if (!planError && planData) {
          setPlan(planData);
        }
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const logout = async () => {
    const token = getSessionToken();
    if (token) {
      await supabase.functions.invoke('auth-logout');
    }
    clearSessionToken();
    setCustomer(null);
    setSubscription(null);
    setPlan(null);
  };

  return (
    <AuthContext.Provider
      value={{
        customer,
        subscription,
        plan,
        loading,
        login,
        signup,
        logout,
        refreshSession,
        checkSubscription,
        syncSubscriptionAndCredits,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
