import { createContext, useContext, useEffect, useState, ReactNode } from "react";
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

interface Usage {
  used_credits: number;
  period_ym: string;
}

interface AuthContextType {
  customer: Customer | null;
  subscription: Subscription | null;
  plan: Plan | null;
  usage: Usage | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string, whatsapp?: string, plan?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  checkSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);

  const getSessionToken = () => localStorage.getItem('session_token');
  const setSessionToken = (token: string) => localStorage.setItem('session_token', token);
  const clearSessionToken = () => localStorage.removeItem('session_token');

  const refreshSession = async () => {
    const token = getSessionToken();
    if (!token) {
      setCustomer(null);
      setSubscription(null);
      setPlan(null);
      setUsage(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('auth-session', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (error || !data) {
        clearSessionToken();
        setCustomer(null);
        setSubscription(null);
        setPlan(null);
        setUsage(null);
        return;
      }

      setCustomer(data.customer);
      setSubscription(data.subscription);
      setPlan(data.plan);
      setUsage(data.usage);
    } catch (error) {
      console.error('Error refreshing session:', error);
      clearSessionToken();
      setCustomer(null);
      setSubscription(null);
      setPlan(null);
      setUsage(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshSession();
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
  };

  const checkSubscription = async () => {
    const token = getSessionToken();
    if (!token) return;

    try {
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (error || !data) {
        console.error('Error checking subscription:', error);
        return;
      }

      // Atualiza apenas o plan_id na subscription
      if (subscription && data.plan_id) {
        setSubscription({
          ...subscription,
          plan_id: data.plan_id,
        });
      }

      // Busca os dados do plano atualizado
      await refreshSession();
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const logout = async () => {
    const token = getSessionToken();
    if (token) {
      await supabase.functions.invoke('auth-logout', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    }
    clearSessionToken();
    setCustomer(null);
    setSubscription(null);
    setPlan(null);
    setUsage(null);
  };

  return (
    <AuthContext.Provider
      value={{
        customer,
        subscription,
        plan,
        usage,
        loading,
        login,
        signup,
        logout,
        refreshSession,
        checkSubscription,
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
