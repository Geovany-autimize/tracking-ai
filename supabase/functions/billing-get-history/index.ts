import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-token',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const authHeader = req.headers.get('x-session-token') || req.headers.get('authorization')?.replace('Bearer ', '');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Buscar customer_id diretamente da tabela sessions
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('customer_id')
      .eq('token_jti', authHeader)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (sessionError || !session?.customer_id) {
      throw new Error('Not authenticated');
    }

    const customer_id = session.customer_id;

    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const type = url.searchParams.get('type');
    const status = url.searchParams.get('status');

    let query = supabase
      .from('billing_transactions')
      .select('*', { count: 'exact' })
      .eq('customer_id', customer_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (type) {
      query = query.eq('type', type);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: transactions, error, count } = await query;

    if (error) {
      throw error;
    }

    console.log(`Retrieved ${transactions?.length || 0} transactions for customer ${customer_id}`);

    return new Response(
      JSON.stringify({
        transactions,
        total: count,
        limit,
        offset,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Error getting billing history:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
