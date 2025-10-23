import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { mime } = await req.json();
    
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(mime)) {
      return new Response(
        JSON.stringify({ error: 'Formato inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date();
    const ext = mime.split('/')[1];
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const hash = crypto.randomUUID().replace(/-/g, '');
    const path = `avatars/${year}/${month}/${hash}.${ext}`;

    const { data, error } = await supabase.storage
      .from('avatars')
      .createSignedUploadUrl(path);

    if (error || !data) {
      console.error('Error creating signed URL:', error);
      return new Response(
        JSON.stringify({ error: error?.message || 'Falha ao criar URL de upload' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        path,
        url: data.signedUrl,
        token: data.token,
        maxBytes: 2 * 1024 * 1024,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in avatar-upload-start:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
