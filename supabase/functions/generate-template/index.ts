import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { sanitizeError } from "../_shared/error-utils.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const TEMPLATE_VARIABLES = [
  // Informações do Cliente
  { label: "Nome Completo", variable: "{{cliente_nome}}", example: "João Silva", category: "cliente" },
  { label: "Primeiro Nome", variable: "{{cliente_primeiro_nome}}", example: "João", category: "cliente" },
  { label: "Sobrenome", variable: "{{cliente_sobrenome}}", example: "Silva", category: "cliente" },
  { label: "E-mail", variable: "{{cliente_email}}", example: "joao@email.com", category: "cliente" },
  { label: "Telefone", variable: "{{cliente_telefone}}", example: "(11) 98765-4321", category: "cliente" },
  
  // Rastreamento
  { label: "Código de Rastreio", variable: "{{tracking_code}}", example: "BR123456789", category: "rastreamento" },
  { label: "Status", variable: "{{status}}", example: "Em trânsito", category: "rastreamento" },
  { label: "Transportadora", variable: "{{transportadora}}", example: "Correios", category: "rastreamento" },
  { label: "Localização Atual", variable: "{{localizacao}}", example: "São Paulo - SP", category: "rastreamento" },
  { label: "Data Atualização", variable: "{{data_atualizacao}}", example: "25/10/2025 14:30", category: "rastreamento" },
  
  // Evento Atual
  { label: "Descrição do Evento", variable: "{{evento_descricao}}", example: "Objeto em trânsito", category: "evento" },
  { label: "Data do Evento", variable: "{{evento_data}}", example: "25/10/2025", category: "evento" },
  { label: "Local do Evento", variable: "{{evento_localizacao}}", example: "Centro de Distribuição - São Paulo/SP", category: "evento" },
  
  // Entrega
  { label: "Previsão de Entrega", variable: "{{previsao_entrega}}", example: "30/10/2025", category: "entrega" },
  { label: "Endereço de Entrega", variable: "{{endereco_entrega}}", example: "Rua das Flores, 123", category: "entrega" },
  { label: "Cidade de Entrega", variable: "{{cidade_entrega}}", example: "São Paulo", category: "entrega" },
  
  // Informações Adicionais
  { label: "Dias em Trânsito", variable: "{{dias_em_transito}}", example: "3 dias", category: "adicional" },
  { label: "Assinado Por", variable: "{{assinado_por}}", example: "João Silva", category: "adicional" }
];

const TRIGGER_CONTEXT: Record<string, string> = {
  'info_received': 'Informação recebida - primeira notificação quando o pedido é registrado',
  'in_transit': 'Em trânsito - pedido está a caminho',
  'out_for_delivery': 'Saiu para entrega - pedido está com o entregador',
  'delivered': 'Entregue - pedido foi entregue com sucesso',
  'failed_attempt': 'Tentativa falhou - entrega não foi realizada',
  'available_for_pickup': 'Disponível para retirada - pedido pode ser retirado',
  'exception': 'Exceção - problema no envio',
  'expired': 'Expirado - prazo de retirada expirou',
  'pending': 'Pendente - aguardando mais informações'
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Requisição recebida`);

  try {
    // Get API key
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    console.log('OPENAI_API_KEY exists:', !!openAIApiKey);
    
    if (!openAIApiKey) {
      console.error('❌ OPENAI_API_KEY não configurada');
      return new Response(
        JSON.stringify({ error: 'API Key não configurada no servidor' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    let body;
    try {
      body = await req.json();
      console.log('Body recebido:', JSON.stringify(body));
    } catch (e) {
      console.error('Erro ao parsear body:', e);
      return new Response(
        JSON.stringify({ error: 'Body inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate inputs with Zod
    const templateSchema = z.object({
      trigger: z.enum(['pending', 'in_transit', 'out_for_delivery', 'delivered', 'failed', 'info_received', 'failed_attempt', 'available_for_pickup', 'exception', 'expired'], {
        errorMap: () => ({ message: 'Trigger inválido' })
      }),
      tone: z.enum(['formal', 'casual', 'friendly'], {
        errorMap: () => ({ message: 'Tom inválido' })
      }).optional().default('friendly'),
    });

    const validation = templateSchema.safeParse(body);
    
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      console.error('❌ Erro de validação:', firstError.message);
      return new Response(
        JSON.stringify({ error: firstError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { trigger, tone } = validation.data;

    console.log('✅ Trigger:', trigger);
    console.log('✅ Tom:', tone);

    const toneMapping: Record<string, string> = {
      'formal': 'Profissional e formal, mantendo respeito e clareza',
      'casual': 'Casual e amigável, mas ainda profissional',
      'friendly': 'Muito amigável e próximo, como uma conversa pessoal'
    };

    const variablesList = TEMPLATE_VARIABLES.map(v => 
      `${v.variable} - ${v.label} (ex: ${v.example})`
    ).join('\n');

    const triggerContext = TRIGGER_CONTEXT[trigger] || trigger;

    const systemPrompt = `Você é um especialista em criar mensagens de notificação para rastreamento de entregas via WhatsApp.

REGRAS OBRIGATÓRIAS:
1. Mensagens devem ter no máximo 1024 caracteres
2. Use formatação WhatsApp: *negrito* para destaques importantes
3. Use quebras de linha (\n\n) para separar seções e melhorar legibilidade
4. Inclua 2-4 variáveis relevantes do sistema (sempre use o formato {{variavel}})
5. Seja claro, direto e profissional
6. Use emojis com moderação (máximo 2 por mensagem, apenas no início de seções)
7. SEMPRE personalize com o nome do cliente usando {{cliente_primeiro_nome}}
8. Estruture a mensagem com parágrafos separados por linhas vazias (\n\n)

VARIÁVEIS DISPONÍVEIS:
${variablesList}

ESTRUTURA RECOMENDADA COM QUEBRAS DE LINHA:
- Saudação personalizada: Olá, {{cliente_primeiro_nome}}!
- LINHA VAZIA (\n\n)
- Informação principal em negrito
- LINHA VAZIA (\n\n)  
- Detalhes relevantes (código, localização, previsão) cada um em uma linha
- LINHA VAZIA (\n\n)
- Mensagem de encerramento

EXEMPLO DE FORMATAÇÃO:
"Olá, {{cliente_primeiro_nome}}!\n\n*Seu pedido está em trânsito* 📦\n\nCódigo: {{tracking_code}}\nLocalização: {{localizacao}}\nPrevisão: {{previsao_entrega}}\n\nEm breve você receberá mais atualizações."

TOM DA MENSAGEM: ${toneMapping[tone] || toneMapping.friendly}
CONTEXTO DO GATILHO: ${triggerContext}

Retorne APENAS um objeto JSON válido:
{
  "message": "mensagem com \\n\\n para quebras de linha e variáveis {{variavel}}",
  "suggestedName": "nome_slug_sem_espacos_lowercase",
  "usedVariables": ["{{var1}}", "{{var2}}"],
  "reasoning": "explicação curta"
}`;

    const userPrompt = `Crie uma mensagem profissional de notificação para o gatilho: ${triggerContext}

A mensagem deve seguir todas as regras especificadas e ser adequada para este contexto específico.`;

    console.log('🔄 Chamando OpenAI API...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 1000,
        temperature: 0.7,
        response_format: { type: "json_object" }
      }),
    });

    console.log('OpenAI Status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro OpenAI:', response.status, errorText);
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao gerar mensagem com IA',
          details: errorText
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('✅ Resposta OpenAI recebida');

    const generatedContent = data.choices[0].message.content;
    const parsedContent = JSON.parse(generatedContent);

    // Validações
    if (!parsedContent.message || parsedContent.message.length > 1024) {
      console.error('❌ Mensagem inválida ou muito longa');
      return new Response(
        JSON.stringify({ error: 'Mensagem gerada é inválida ou muito longa' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar se variáveis usadas existem
    const availableVariables = TEMPLATE_VARIABLES.map(v => v.variable);
    const usedVariables = parsedContent.usedVariables || [];
    const invalidVariables = usedVariables.filter((v: string) => !availableVariables.includes(v));
    
    if (invalidVariables.length > 0) {
      console.warn('⚠️ Variáveis inválidas detectadas:', invalidVariables);
    }

    console.log('✅ Template gerado:', parsedContent.suggestedName);

    return new Response(
      JSON.stringify({
        message: parsedContent.message,
        suggestedName: parsedContent.suggestedName,
        usedVariables: parsedContent.usedVariables,
        reasoning: parsedContent.reasoning
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const sanitized = sanitizeError(error, requestId);
    return new Response(
      JSON.stringify(sanitized),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
