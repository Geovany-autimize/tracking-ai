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

    // Create admin client for database operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Extract session token
    const sessionToken = req.headers.get("x-session-token");
    const authHeader = req.headers.get("Authorization");
    const token = sessionToken || (authHeader ? authHeader.replace("Bearer ", "") : null);
    if (!token) throw new Error("No session token provided");

    // Validate session via sessions table
    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .from("sessions")
      .select("customer_id")
      .eq("token_jti", token)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (sessionError || !sessionData) {
      logStep("Session validation failed", { error: sessionError?.message });
      throw new Error("Invalid or expired session");
    }
    logStep("Session validated", { customerId: sessionData.customer_id });

    // Construir objeto de atualização
    const updates: any = { updated_at: new Date().toISOString() };
    if (enabled !== undefined) updates.enabled = enabled;
    if (min_credits_threshold !== undefined) updates.min_credits_threshold = min_credits_threshold;
    if (recharge_amount !== undefined) updates.recharge_amount = recharge_amount;

    logStep("Updating settings", updates);

    // Try to update existing settings
    let { data, error: updateError } = await supabaseAdmin
      .from("auto_recharge_settings")
      .update(updates)
      .eq("customer_id", sessionData.customer_id)
      .select()
      .single();

    // If no existing settings, create with defaults
    if (updateError && updateError.code === 'PGRST116') {
      logStep("No existing settings, creating new one");
      const { data: newData, error: insertError } = await supabaseAdmin
        .from("auto_recharge_settings")
        .insert({
          customer_id: sessionData.customer_id,
          enabled: updates.enabled ?? false,
          min_credits_threshold: updates.min_credits_threshold ?? 100,
          recharge_amount: updates.recharge_amount ?? 500,
        })
        .select()
        .single();
      
      if (insertError) throw insertError;
      data = newData;
    } else if (updateError) {
      throw updateError;
    }

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
