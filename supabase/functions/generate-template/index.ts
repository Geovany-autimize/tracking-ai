import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TEMPLATE_VARIABLES = [
  { label: "Nome do Cliente", variable: "{{cliente_nome}}", example: "João Silva" },
  { label: "Primeiro Nome", variable: "{{cliente_primeiro_nome}}", example: "João" },
  { label: "Email do Cliente", variable: "{{cliente_email}}", example: "joao@email.com" },
  { label: "Telefone do Cliente", variable: "{{cliente_telefone}}", example: "+55 11 99999-9999" },
  { label: "Código de Rastreamento", variable: "{{tracking_code}}", example: "BR123456789" },
  { label: "Status Atual", variable: "{{status_atual}}", example: "Em trânsito" },
  { label: "Transportadora", variable: "{{transportadora}}", example: "Correios" },
  { label: "Última Atualização", variable: "{{ultima_atualizacao}}", example: "15/01/2025 14:30" },
  { label: "Origem", variable: "{{origem}}", example: "São Paulo - SP" },
  { label: "Destino", variable: "{{destino}}", example: "Rio de Janeiro - RJ" },
  { label: "Data de Postagem", variable: "{{data_postagem}}", example: "10/01/2025" },
  { label: "Previsão de Entrega", variable: "{{previsao_entrega}}", example: "20/01/2025" },
  { label: "Data de Entrega", variable: "{{data_entrega}}", example: "18/01/2025" },
  { label: "Local Atual", variable: "{{local_atual}}", example: "Centro de Distribuição - SP" },
  { label: "Cidade Atual", variable: "{{cidade_atual}}", example: "Campinas" },
  { label: "Estado Atual", variable: "{{estado_atual}}", example: "SP" },
  { label: "Número do Pedido", variable: "{{numero_pedido}}", example: "#12345" },
  { label: "Recebedor", variable: "{{recebedor}}", example: "Maria Silva" },
  { label: "Documento Recebedor", variable: "{{documento_recebedor}}", example: "123.456.789-00" },
  { label: "Tentativas de Entrega", variable: "{{tentativas_entrega}}", example: "2" },
  { label: "Peso", variable: "{{peso}}", example: "2.5 kg" },
  { label: "Dimensões", variable: "{{dimensoes}}", example: "30x20x15 cm" },
  { label: "Valor Declarado", variable: "{{valor_declarado}}", example: "R$ 150,00" },
  { label: "Observações", variable: "{{observacoes}}", example: "Entrega com assinatura" },
  { label: "Link de Rastreamento", variable: "{{link_rastreamento}}", example: "https://rastreio.com/BR123456789" },
];

const TRIGGER_CONTEXT = {
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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { trigger, tone = 'formal' }: { 
      trigger: string; 
      tone?: 'formal' | 'casual' | 'friendly' 
    } = await req.json();

    if (!trigger || trigger.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Tipo de template é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!openAIApiKey) {
      console.error('OPENAI_API_KEY não configurada');
      return new Response(
        JSON.stringify({ error: 'Configuração inválida do servidor' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('API Key disponível:', openAIApiKey ? 'Sim' : 'Não');
    console.log('Trigger recebido:', trigger);
    console.log('Tom selecionado:', tone);

    const toneMapping = {
      'formal': 'Profissional e formal, mantendo respeito e clareza',
      'casual': 'Casual e amigável, mas ainda profissional',
      'friendly': 'Muito amigável e próximo, como uma conversa pessoal'
    };

    const variablesList = TEMPLATE_VARIABLES.map(v => 
      `${v.variable} - ${v.label} (ex: ${v.example})`
    ).join('\n');

    const triggerContext = trigger ? (TRIGGER_CONTEXT as any)[trigger] || '' : '';

    const systemPrompt = `Você é um especialista em criar mensagens de notificação para rastreamento de entregas via WhatsApp.

REGRAS OBRIGATÓRIAS:
1. Mensagens devem ter no máximo 1024 caracteres
2. Use formatação WhatsApp: *negrito* para destaques, _itálico_ para ênfases sutis
3. Inclua 2-4 variáveis relevantes do sistema (sempre use o formato {{variavel}})
4. Seja claro, direto e profissional
5. Use emojis com moderação (máximo 2-3 por mensagem)
6. SEMPRE personalize com o nome do cliente usando {{cliente_primeiro_nome}} ou {{cliente_nome}}
7. Inclua informações relevantes como código de rastreamento quando apropriado

VARIÁVEIS DISPONÍVEIS:
${variablesList}

ESTRUTURA RECOMENDADA:
- Saudação personalizada (use {{cliente_primeiro_nome}})
- Informação principal clara e direta
- Detalhes relevantes (código, localização, previsão)
- Call-to-action ou próximo passo (quando aplicável)

TOM DA MENSAGEM: ${toneMapping[tone] || toneMapping.formal}
${triggerContext ? `CONTEXTO DO GATILHO: ${triggerContext}` : ''}

Retorne APENAS um objeto JSON válido com esta estrutura exata:
{
  "message": "mensagem gerada com variáveis no formato {{variavel}}",
  "suggestedName": "nome_slug_descritivo_sem_espacos_em_lowercase",
  "usedVariables": ["{{variavel1}}", "{{variavel2}}"],
  "reasoning": "breve explicação das escolhas (max 100 chars)"
}`;

    const userPrompt = `Crie uma mensagem profissional de notificação para o gatilho: ${triggerContext}

A mensagem deve seguir todas as regras especificadas e ser adequada para este contexto específico.`;

    console.log('Chamando OpenAI API...');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_completion_tokens: 1000,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Erro na API OpenAI:', response.status, errorData);
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao gerar mensagem com IA',
          details: `Status ${response.status}`
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('Resposta da OpenAI recebida');

    const generatedContent = data.choices[0].message.content;
    const parsedContent = JSON.parse(generatedContent);

    // Validações
    if (!parsedContent.message || parsedContent.message.length > 1024) {
      console.error('Mensagem inválida ou muito longa');
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
      console.warn('Variáveis inválidas detectadas:', invalidVariables);
    }

    console.log('Template gerado com sucesso:', parsedContent.suggestedName);

    return new Response(
      JSON.stringify({
        message: parsedContent.message,
        suggestedName: parsedContent.suggestedName,
        usedVariables: parsedContent.usedVariables,
        reasoning: parsedContent.reasoning
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Erro na função generate-template:', error);
    return new Response(
      JSON.stringify({ 
        error: error?.message || 'Erro interno ao gerar template',
        type: error?.name
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
