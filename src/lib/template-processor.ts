export interface TemplateVariables {
  // Informações do Cliente
  cliente_nome: string;
  cliente_primeiro_nome: string;
  cliente_sobrenome: string;
  cliente_email: string;
  cliente_telefone: string;
  
  // Rastreamento
  tracking_code: string;
  tracker_id: string;
  status: string;
  status_milestone: string;
  transportadora: string;
  localizacao: string;
  data_atualizacao: string;
  
  // Evento Atual
  evento_descricao: string;
  evento_data: string;
  evento_hora: string;
  evento_localizacao: string;
  
  // Entrega
  previsao_entrega: string;
  endereco_entrega: string;
  cidade_entrega: string;
  estado_entrega: string;
  cep_entrega: string;
  pais_origem: string;
  pais_destino: string;
  
  // Informações Adicionais
  dias_em_transito: string;
  referencia_envio: string;
  assinado_por: string;
  
  // Datas do Processo
  data_info_recebida: string;
  data_em_transito: string;
  data_saiu_entrega: string;
  data_entregue: string;
  data_tentativa_falha: string;
  data_excecao: string;
}

export function processTemplate(
  content: string, 
  variables: Partial<TemplateVariables>
): string {
  let result = content;
  
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, value || '');
  });
  
  return result;
}

export function getExampleVariables(): TemplateVariables {
  const now = new Date();
  const formatDate = (date: Date) => date.toLocaleDateString('pt-BR');
  const formatDateTime = (date: Date) => date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  const formatTime = (date: Date) => date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });
  
  return {
    // Informações do Cliente
    cliente_nome: 'João Silva',
    cliente_primeiro_nome: 'João',
    cliente_sobrenome: 'Silva',
    cliente_email: 'joao.silva@email.com',
    cliente_telefone: '(11) 98765-4321',
    
    // Rastreamento
    tracking_code: 'BR123456789',
    tracker_id: 'tracker_abc123',
    status: 'Em trânsito',
    status_milestone: 'in_transit',
    transportadora: 'Correios',
    localizacao: 'São Paulo - SP',
    data_atualizacao: formatDateTime(now),
    
    // Evento Atual
    evento_descricao: 'Objeto em trânsito - por favor aguarde',
    evento_data: formatDate(now),
    evento_hora: formatTime(now),
    evento_localizacao: 'Centro de Distribuição - São Paulo/SP',
    
    // Entrega
    previsao_entrega: formatDate(new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000)),
    endereco_entrega: 'Rua das Flores, 123',
    cidade_entrega: 'São Paulo',
    estado_entrega: 'SP',
    cep_entrega: '01234-567',
    pais_origem: 'BR',
    pais_destino: 'BR',
    
    // Informações Adicionais
    dias_em_transito: '3 dias',
    referencia_envio: 'REF-2025-001',
    assinado_por: 'João Silva',
    
    // Datas do Processo
    data_info_recebida: formatDateTime(new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)),
    data_em_transito: formatDateTime(new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)),
    data_saiu_entrega: formatDateTime(new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000)),
    data_entregue: '',
    data_tentativa_falha: '',
    data_excecao: ''
  };
}

export function validateTemplate(content: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!content || content.trim().length === 0) {
    errors.push('A mensagem não pode estar vazia');
  }
  
  if (content.length > 1024) {
    errors.push('A mensagem não pode ter mais de 1024 caracteres');
  }
  
  // Check for unclosed variables
  const openBraces = (content.match(/{{/g) || []).length;
  const closeBraces = (content.match(/}}/g) || []).length;
  
  if (openBraces !== closeBraces) {
    errors.push('Variáveis mal formatadas (verifique {{ e }})');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
