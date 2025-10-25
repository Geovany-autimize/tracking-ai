import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-token',
};

interface CourierData {
  courierCode: string;
  courierName: string;
  website: string | null;
  isPost: boolean;
  countryCode: string | null;
  requiredFields: any | null;
  isDeprecated: boolean;
}

interface UpdateCouriersRequest {
  data: {
    couriers: CourierData[];
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    // Get session token from headers
    const sessionToken = req.headers.get('x-session-token');
    if (!sessionToken) {
      console.error('No session token provided');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify session
    const { data: sessionData, error: sessionError } = await supabaseClient
      .from('sessions')
      .select('customer_id, expires_at')
      .eq('token_jti', sessionToken)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (sessionError || !sessionData) {
      console.error('Invalid or expired session:', sessionError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: UpdateCouriersRequest = await req.json();
    
    if (!body.data || !Array.isArray(body.data.couriers)) {
      return new Response(
        JSON.stringify({ error: 'Invalid request format. Expected { data: { couriers: [...] } }' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const couriers = body.data.couriers;
    console.log(`Processing ${couriers.length} couriers`);

    let inserted = 0;
    let updated = 0;
    let errors = 0;

    // Process each courier with upsert
    for (const courier of couriers) {
      const courierData = {
        courier_code: courier.courierCode,
        courier_name: courier.courierName,
        website: courier.website,
        is_post: courier.isPost,
        country_code: courier.countryCode,
        required_fields: courier.requiredFields,
        is_deprecated: courier.isDeprecated,
      };

      // Check if courier exists
      const { data: existing } = await supabaseClient
        .from('couriers')
        .select('courier_code')
        .eq('courier_code', courier.courierCode)
        .single();

      if (existing) {
        // Update existing courier
        const { error: updateError } = await supabaseClient
          .from('couriers')
          .update(courierData)
          .eq('courier_code', courier.courierCode);

        if (updateError) {
          console.error(`Error updating courier ${courier.courierCode}:`, updateError);
          errors++;
        } else {
          updated++;
        }
      } else {
        // Insert new courier
        const { error: insertError } = await supabaseClient
          .from('couriers')
          .insert(courierData);

        if (insertError) {
          console.error(`Error inserting courier ${courier.courierCode}:`, insertError);
          errors++;
        } else {
          inserted++;
        }
      }
    }

    console.log(`Completed: ${inserted} inserted, ${updated} updated, ${errors} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          total: couriers.length,
          inserted,
          updated,
          errors,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in update-couriers function:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
