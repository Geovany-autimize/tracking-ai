import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-session-token",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[UPDATE-AUTO-RECHARGE-SETTINGS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { enabled, min_credits_threshold, recharge_amount } = await req.json();

    // Validações
    if (min_credits_threshold !== undefined && (min_credits_threshold < 50 || min_credits_threshold > 1000)) {
      throw new Error("Limite mínimo deve estar entre 50 e 1000 créditos");
    }

    if (recharge_amount !== undefined && (recharge_amount < 100 || recharge_amount > 5000)) {
      throw new Error("Valor de recarga deve estar entre 100 e 5000 créditos");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    const sessionToken = req.headers.get("x-session-token");
    const token = sessionToken || (authHeader ? authHeader.replace("Bearer ", "") : null);
    
    if (!token) throw new Error("No session token provided");

    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Construir objeto de atualização
    const updates: any = { updated_at: new Date().toISOString() };
    if (enabled !== undefined) updates.enabled = enabled;
    if (min_credits_threshold !== undefined) updates.min_credits_threshold = min_credits_threshold;
    if (recharge_amount !== undefined) updates.recharge_amount = recharge_amount;

    logStep("Updating settings", updates);

    // Atualizar configurações
    const { data, error } = await supabaseClient
      .from("auto_recharge_settings")
      .update(updates)
      .eq("customer_id", user.id)
      .select()
      .single();

    if (error) throw error;

    logStep("Settings updated successfully");

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
