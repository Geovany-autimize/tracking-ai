import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

interface Ship24Response {
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
    console.log('Starting courier sync from Ship24 API...');

    // Get Ship24 API key from environment
    const ship24ApiKey = Deno.env.get('SHIP24_API_KEY');
    if (!ship24ApiKey) {
      console.error('SHIP24_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'SHIP24_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch couriers from Ship24 API
    console.log('Fetching couriers from Ship24...');
    const ship24Response = await fetch('https://api.ship24.com/public/v1/couriers', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ship24ApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!ship24Response.ok) {
      const errorText = await ship24Response.text();
      console.error('Ship24 API error:', ship24Response.status, errorText);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch from Ship24 API',
          status: ship24Response.status,
          details: errorText
        }),
        { status: ship24Response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ship24Data: Ship24Response = await ship24Response.json();
    
    if (!ship24Data.data?.couriers || !Array.isArray(ship24Data.data.couriers)) {
      console.error('Invalid response format from Ship24 API');
      return new Response(
        JSON.stringify({ error: 'Invalid response format from Ship24 API' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Received ${ship24Data.data.couriers.length} couriers from Ship24`);

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Transform and upsert couriers
    const couriersToUpsert = ship24Data.data.couriers.map(courier => ({
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

    console.log(`Successfully synced all ${totalUpserted} couriers from Ship24`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully synced ${totalUpserted} couriers from Ship24`,
        count: totalUpserted,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing sync:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
