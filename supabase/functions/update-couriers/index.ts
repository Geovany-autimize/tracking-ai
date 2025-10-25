import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-token',
};

interface CourierData {
  courierCode: string;
  courierName: string;
  website?: string | null;
  isPost: boolean;
  countryCode?: string | null;
  requiredFields?: any;
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
    // Get session token from header
    const token = req.headers.get('x-session-token') || 
                  req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      console.error('No authentication token provided');
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify session
    const { data: sessionData, error: sessionError } = await supabase
      .from('sessions')
      .select('customer_id')
      .eq('token_jti', token)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (sessionError || !sessionData) {
      console.error('Invalid or expired session:', sessionError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: UpdateCouriersRequest = await req.json();
    
    if (!body.data?.couriers || !Array.isArray(body.data.couriers)) {
      console.error('Invalid request format');
      return new Response(
        JSON.stringify({ error: 'Invalid request format. Expected { data: { couriers: [] } }' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${body.data.couriers.length} couriers...`);

    // Transform and upsert couriers
    const couriersToUpsert = body.data.couriers.map(courier => ({
      courier_code: courier.courierCode,
      courier_name: courier.courierName,
      website: courier.website || null,
      is_post: courier.isPost,
      country_code: courier.countryCode || null,
      required_fields: courier.requiredFields || null,
      is_deprecated: courier.isDeprecated,
    }));

    // Batch upsert in chunks of 100 to avoid timeout
    const chunkSize = 100;
    const chunks = [];
    for (let i = 0; i < couriersToUpsert.length; i += chunkSize) {
      chunks.push(couriersToUpsert.slice(i, i + chunkSize));
    }

    let totalUpserted = 0;
    const errors = [];

    for (const chunk of chunks) {
      const { data, error } = await supabase
        .from('couriers')
        .upsert(chunk, {
          onConflict: 'courier_code',
          ignoreDuplicates: false,
        });

      if (error) {
        console.error('Error upserting chunk:', error);
        errors.push(error);
      } else {
        totalUpserted += chunk.length;
        console.log(`Upserted ${chunk.length} couriers successfully`);
      }
    }

    if (errors.length > 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: `Partially completed. Upserted ${totalUpserted} couriers with ${errors.length} errors`,
          errors: errors,
        }),
        { status: 207, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully upserted all ${totalUpserted} couriers`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully updated ${totalUpserted} couriers`,
        count: totalUpserted,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
