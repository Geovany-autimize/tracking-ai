import { supabase } from "@/integrations/supabase/client";

/**
 * Calcula créditos disponíveis para um cliente
 * Usa credit_usage como fonte única da verdade
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
        // Contar créditos consumidos via credit_usage (não via shipments)
        const { count } = await supabase
          .from('credit_usage')
          .select('id', { count: 'exact', head: true })
          .eq('customer_id', customerId)
          .eq('source_type', 'monthly')
          .gte('subscription_period_start', subscription.current_period_start)
          .lt('subscription_period_end', subscription.current_period_end);
        const usedThisPeriod = count || 0;
        monthlyRemaining = Math.max(0, monthlyCredits - usedThisPeriod);
      }
    }
  } catch (e) {
    console.error('Error computing monthly credits:', e);
  }

  // Extra purchased credits (non-expired) - calcular via credit_usage
  const { data: purchases, error: purchasesError } = await supabase
    .from("credit_purchases")
    .select("id, credits_amount")
    .eq("customer_id", customerId)
    .eq("status", "completed")
    .gt("expires_at", new Date().toISOString());

  if (purchasesError) {
    console.error("Error fetching credit purchases:", purchasesError);
    return monthlyRemaining; // Return monthly if purchases query fails
  }

  // Para cada compra, contar créditos consumidos via credit_usage
  let extraRemaining = 0;
  for (const purchase of purchases || []) {
    const { count } = await supabase
      .from('credit_usage')
      .select('id', { count: 'exact', head: true })
      .eq('customer_id', customerId)
      .eq('source_type', 'purchase')
      .eq('purchase_id', purchase.id);
    
    const usedFromPurchase = count || 0;
    extraRemaining += Math.max(0, purchase.credits_amount - usedFromPurchase);
  }

  return monthlyRemaining + extraRemaining;
}

/**
 * Calcula créditos mensais usados no período atual
 */
export async function getMonthlyUsedCredits(customerId: string): Promise<number> {
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
        .from('credit_usage')
        .select('id', { count: 'exact', head: true })
        .eq('customer_id', customerId)
        .eq('source_type', 'monthly')
        .gte('subscription_period_start', subscription.current_period_start)
        .lt('subscription_period_end', subscription.current_period_end);
      return count || 0;
    }
  } catch (e) {
    console.error('Error computing monthly used credits:', e);
  }
  return 0;
}

/**
 * Calcula créditos usados por um cliente no período atual
 * Usa credit_usage como fonte única da verdade
 * Conta TODOS os créditos usados (mensais + extras) do período atual
 */
export async function getUsedCredits(customerId: string): Promise<number> {
  try {
    // Contar créditos mensais usados no período atual
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('current_period_start, current_period_end, status')
      .eq('customer_id', customerId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (subscription) {
      // Contar créditos mensais usados no período atual
      const { count: monthlyUsed } = await supabase
        .from('credit_usage')
        .select('id', { count: 'exact', head: true })
        .eq('customer_id', customerId)
        .eq('source_type', 'monthly')
        .gte('subscription_period_start', subscription.current_period_start)
        .lt('subscription_period_end', subscription.current_period_end);

      // Contar créditos extras usados no período atual (compras não expiradas)
      const { data: purchases } = await supabase
        .from("credit_purchases")
        .select("id")
        .eq("customer_id", customerId)
        .eq("status", "completed")
        .gt("expires_at", new Date().toISOString());

      let extraUsed = 0;
      if (purchases && purchases.length > 0) {
        const purchaseIds = purchases.map(p => p.id);
        const { count: purchaseUsed } = await supabase
          .from('credit_usage')
          .select('id', { count: 'exact', head: true })
          .eq('customer_id', customerId)
          .eq('source_type', 'purchase')
          .in('purchase_id', purchaseIds);
        extraUsed = purchaseUsed || 0;
      }

      return (monthlyUsed || 0) + extraUsed;
    }
  } catch (e) {
    console.error('Error computing used credits:', e);
  }

  // Fallback: contar todos os créditos extras consumidos via credit_usage
  const { count } = await supabase
    .from('credit_usage')
    .select('id', { count: 'exact', head: true })
    .eq('customer_id', customerId)
    .eq('source_type', 'purchase');

  return count || 0;
}

/**
 * Calcula o total de créditos adquiridos (plano mensal + extras comprados)
 * Não desconta os créditos usados, apenas retorna o total adquirido
 */
export async function getTotalPurchasedCredits(customerId: string): Promise<number> {
  let totalPurchased = 0;

  // Créditos mensais do plano
  try {
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan_id, status')
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
      totalPurchased += plan?.monthly_credits || 0;
    }
  } catch (e) {
    console.error('Error computing monthly credits:', e);
  }

  // Créditos extras comprados (não expirados)
  try {
    const { data: purchases, error: purchasesError } = await supabase
      .from("credit_purchases")
      .select("credits_amount")
      .eq("customer_id", customerId)
      .eq("status", "completed")
      .gt("expires_at", new Date().toISOString());

    if (purchasesError) {
      console.error("Error fetching credit purchases:", purchasesError);
    } else {
      totalPurchased += (purchases || []).reduce((sum, p) => sum + p.credits_amount, 0);
    }
  } catch (e) {
    console.error('Error computing extra credits:', e);
  }

  return totalPurchased;
}

/**
 * Consome um crédito via edge function
 * @param trackingCode Opcional: código de rastreio para auditoria
 * @returns Resultado do consumo
 */
export async function consumeCredit(trackingCode?: string): Promise<{ success: boolean; message: string; remaining_credits?: number }> {
  try {
    const { data, error } = await supabase.functions.invoke("consume-credit", {
      method: "POST",
      body: trackingCode ? { tracking_code: trackingCode } : undefined,
    });

    if (error) throw error;

    return {
      success: data.success,
      message: data.message || data.error || "Erro desconhecido",
      remaining_credits: data.remaining_credits,
    };
  } catch (error) {
    console.error("Error consuming credit:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Erro ao consumir crédito",
    };
  }
}
