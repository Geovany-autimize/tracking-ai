export interface TemplateVariables {
  cliente_nome: string;
  tracking_code: string;
  status: string;
  transportadora: string;
  localizacao: string;
  data_atualizacao: string;
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
  return {
    cliente_nome: 'João Silva',
    tracking_code: 'BR123456789',
    status: 'Em trânsito',
    transportadora: 'Correios',
    localizacao: 'São Paulo - SP',
    data_atualizacao: new Date().toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
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
