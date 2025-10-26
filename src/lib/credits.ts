import { supabase } from "@/integrations/supabase/client";

/**
 * Calcula créditos disponíveis para um cliente
 * Soma todos os créditos não expirados menos os consumidos
 */
export async function getAvailableCredits(customerId: string): Promise<number> {
  // Monthly subscription credits
  let monthlyRemaining = 0;
  try {
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('current_period_start, current_period_end, plan_id, status')
      .eq('customer_id', customerId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (subscription) {
      const { data: plan } = await supabase
        .from('plans')
        .select('monthly_credits')
        .eq('id', subscription.plan_id)
        .single();
      const monthlyCredits = plan?.monthly_credits || 0;
      if (monthlyCredits > 0) {
        const { count } = await supabase
          .from('shipments')
          .select('id', { count: 'exact', head: true })
          .eq('customer_id', customerId)
          .gte('created_at', subscription.current_period_start)
          .lt('created_at', subscription.current_period_end);
        const usedThisPeriod = count || 0;
        monthlyRemaining = Math.max(0, monthlyCredits - usedThisPeriod);
      }
    }
  } catch (e) {
    console.error('Error computing monthly credits:', e);
  }

  // Extra purchased credits (non-expired)
  const { data: purchases, error } = await supabase
    .from("credit_purchases")
    .select("credits_amount, consumed_credits")
    .eq("customer_id", customerId)
    .eq("status", "completed")
    .gt("expires_at", new Date().toISOString());

  if (error) {
    console.error("Error fetching available credits:", error);
    return monthlyRemaining; // Return monthly if purchases query fails
  }

  const extraRemaining = purchases?.reduce(
    (sum, purchase) => sum + (purchase.credits_amount - purchase.consumed_credits),
    0
  ) || 0;

  return monthlyRemaining + extraRemaining;
}

/**
 * Calcula créditos usados por um cliente
 * Soma todos os consumed_credits
 */
export async function getUsedCredits(customerId: string): Promise<number> {
  // If subscription exists, used credits are shipments created in current period
  try {
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('current_period_start, current_period_end, status')
      .eq('customer_id', customerId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (subscription) {
      const { count } = await supabase
        .from('shipments')
        .select('id', { count: 'exact', head: true })
        .eq('customer_id', customerId)
        .gte('created_at', subscription.current_period_start)
        .lt('created_at', subscription.current_period_end);
      return count || 0;
    }
  } catch (e) {
    console.error('Error computing used credits (monthly):', e);
  }

  // Fallback: sum of consumed extra credits
  const { data: purchases, error } = await supabase
    .from('credit_purchases')
    .select('consumed_credits')
    .eq('customer_id', customerId);

  if (error) {
    console.error('Error fetching used credits:', error);
    return 0;
  }

  return purchases?.reduce(
    (sum, purchase) => sum + purchase.consumed_credits,
    0
  ) || 0;
}

/**
 * Consome um crédito via edge function
 * Retorna true se sucesso, false se sem créditos
 */
export async function consumeCredit(): Promise<{ success: boolean; message: string }> {
  try {
    const { data, error } = await supabase.functions.invoke("consume-credit", {
      method: "POST",
    });

    if (error) throw error;

    return {
      success: data.success,
      message: data.message || data.error || "Erro desconhecido",
    };
  } catch (error) {
    console.error("Error consuming credit:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Erro ao consumir crédito",
    };
  }
}
