import { supabase } from "@/integrations/supabase/client";

/**
 * Calcula créditos disponíveis para um cliente
 * Soma todos os créditos não expirados menos os consumidos
 */
export async function getAvailableCredits(customerId: string): Promise<number> {
  const { data: purchases, error } = await supabase
    .from("credit_purchases")
    .select("credits_amount, consumed_credits")
    .eq("customer_id", customerId)
    .eq("status", "completed")
    .gt("expires_at", new Date().toISOString());

  if (error) {
    console.error("Error fetching available credits:", error);
    return 0;
  }

  return purchases?.reduce(
    (sum, purchase) => sum + (purchase.credits_amount - purchase.consumed_credits),
    0
  ) || 0;
}

/**
 * Calcula créditos usados por um cliente
 * Soma todos os consumed_credits
 */
export async function getUsedCredits(customerId: string): Promise<number> {
  const { data: purchases, error } = await supabase
    .from("credit_purchases")
    .select("consumed_credits")
    .eq("customer_id", customerId);

  if (error) {
    console.error("Error fetching used credits:", error);
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
