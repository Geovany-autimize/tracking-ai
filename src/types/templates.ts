export type NotificationTrigger = 
  | 'info_received'
  | 'in_transit'
  | 'out_for_delivery'
  | 'failed_attempt'
  | 'delivered'
  | 'available_for_pickup'
  | 'exception'
  | 'pending'
  | 'expired';

export interface MessageTemplate {
  id: string;
  customer_id: string;
  name: string;
  notification_type: string[];
  is_active: boolean;
  message_content: string;
  created_at: string;
  updated_at: string;
}

export interface TemplateVariable {
  label: string;
  variable: string;
  description: string;
  example: string;
  category: string;
}

export const TEMPLATE_VARIABLES: TemplateVariable[] = [
  // Informações do Cliente
  {
    label: 'Nome Completo',
    variable: '{{cliente_nome}}',
    description: 'Nome completo do cliente',
    example: 'João Silva',
    category: 'cliente'
  },
  {
    label: 'Primeiro Nome',
    variable: '{{cliente_primeiro_nome}}',
    description: 'Primeiro nome do cliente',
    example: 'João',
    category: 'cliente'
  },
  {
    label: 'Sobrenome',
    variable: '{{cliente_sobrenome}}',
    description: 'Sobrenome do cliente',
    example: 'Silva',
    category: 'cliente'
  },
  {
    label: 'E-mail',
    variable: '{{cliente_email}}',
    description: 'E-mail do cliente',
    example: 'joao@email.com',
    category: 'cliente'
  },
  {
    label: 'Telefone',
    variable: '{{cliente_telefone}}',
    description: 'Telefone do cliente',
    example: '(11) 98765-4321',
    category: 'cliente'
  },
  
  // Rastreamento
  {
    label: 'Código de Rastreio',
    variable: '{{tracking_code}}',
    description: 'Código de rastreamento do pedido',
    example: 'BR123456789',
    category: 'rastreamento'
  },
  {
    label: 'ID do Rastreador',
    variable: '{{tracker_id}}',
    description: 'ID único do rastreador',
    example: 'tracker_abc123',
    category: 'rastreamento'
  },
  {
    label: 'Status',
    variable: '{{status}}',
    description: 'Status atual do pedido',
    example: 'Em trânsito',
    category: 'rastreamento'
  },
  {
    label: 'Status Detalhado',
    variable: '{{status_milestone}}',
    description: 'Status milestone detalhado',
    example: 'out_for_delivery',
    category: 'rastreamento'
  },
  {
    label: 'Transportadora',
    variable: '{{transportadora}}',
    description: 'Nome da transportadora',
    example: 'Correios',
    category: 'rastreamento'
  },
  {
    label: 'Localização Atual',
    variable: '{{localizacao}}',
    description: 'Última localização conhecida',
    example: 'São Paulo - SP',
    category: 'rastreamento'
  },
  {
    label: 'Data Atualização',
    variable: '{{data_atualizacao}}',
    description: 'Data e hora da última atualização',
    example: '25/10/2025 14:30',
    category: 'rastreamento'
  },
  
  // Evento Atual
  {
    label: 'Descrição do Evento',
    variable: '{{evento_descricao}}',
    description: 'Descrição do último evento',
    example: 'Objeto em trânsito - por favor aguarde',
    category: 'evento'
  },
  {
    label: 'Data do Evento',
    variable: '{{evento_data}}',
    description: 'Data do último evento',
    example: '25/10/2025',
    category: 'evento'
  },
  {
    label: 'Hora do Evento',
    variable: '{{evento_hora}}',
    description: 'Hora do último evento',
    example: '14:30',
    category: 'evento'
  },
  {
    label: 'Local do Evento',
    variable: '{{evento_localizacao}}',
    description: 'Localização do último evento',
    example: 'Centro de Distribuição - São Paulo/SP',
    category: 'evento'
  },
  
  // Entrega
  {
    label: 'Previsão de Entrega',
    variable: '{{previsao_entrega}}',
    description: 'Data prevista de entrega',
    example: '30/10/2025',
    category: 'entrega'
  },
  {
    label: 'Endereço de Entrega',
    variable: '{{endereco_entrega}}',
    description: 'Endereço completo de entrega',
    example: 'Rua das Flores, 123',
    category: 'entrega'
  },
  {
    label: 'Cidade de Entrega',
    variable: '{{cidade_entrega}}',
    description: 'Cidade de entrega',
    example: 'São Paulo',
    category: 'entrega'
  },
  {
    label: 'Estado de Entrega',
    variable: '{{estado_entrega}}',
    description: 'Estado de entrega',
    example: 'SP',
    category: 'entrega'
  },
  {
    label: 'CEP de Entrega',
    variable: '{{cep_entrega}}',
    description: 'CEP de entrega',
    example: '01234-567',
    category: 'entrega'
  },
  {
    label: 'País de Origem',
    variable: '{{pais_origem}}',
    description: 'País de origem do envio',
    example: 'BR',
    category: 'entrega'
  },
  {
    label: 'País de Destino',
    variable: '{{pais_destino}}',
    description: 'País de destino do envio',
    example: 'BR',
    category: 'entrega'
  },
  
  // Informações Adicionais
  {
    label: 'Dias em Trânsito',
    variable: '{{dias_em_transito}}',
    description: 'Dias desde a postagem',
    example: '3 dias',
    category: 'adicional'
  },
  {
    label: 'Referência do Envio',
    variable: '{{referencia_envio}}',
    description: 'Referência interna do envio',
    example: 'REF-2025-001',
    category: 'adicional'
  },
  {
    label: 'Assinado Por',
    variable: '{{assinado_por}}',
    description: 'Nome de quem assinou a entrega',
    example: 'João Silva',
    category: 'adicional'
  },
  
  // Datas do Processo
  {
    label: 'Data Info Recebida',
    variable: '{{data_info_recebida}}',
    description: 'Data de recebimento da informação',
    example: '20/10/2025 10:00',
    category: 'datas'
  },
  {
    label: 'Data Em Trânsito',
    variable: '{{data_em_transito}}',
    description: 'Data de início do trânsito',
    example: '21/10/2025 08:30',
    category: 'datas'
  },
  {
    label: 'Data Saiu para Entrega',
    variable: '{{data_saiu_entrega}}',
    description: 'Data de saída para entrega',
    example: '25/10/2025 06:00',
    category: 'datas'
  },
  {
    label: 'Data Entregue',
    variable: '{{data_entregue}}',
    description: 'Data de entrega efetiva',
    example: '25/10/2025 14:30',
    category: 'datas'
  },
  {
    label: 'Data Tentativa Falha',
    variable: '{{data_tentativa_falha}}',
    description: 'Data da tentativa de entrega falha',
    example: '24/10/2025 16:00',
    category: 'datas'
  },
  {
    label: 'Data Exceção',
    variable: '{{data_excecao}}',
    description: 'Data de registro de exceção',
    example: '23/10/2025 11:00',
    category: 'datas'
  }
];

export interface TriggerOption {
  value: NotificationTrigger;
  label: string;
  description: string;
  icon: string;
}

export const TRIGGER_OPTIONS: TriggerOption[] = [
  {
    value: 'info_received',
    label: '📋 Informação Recebida',
    description: 'Dispara quando a transportadora recebe as informações do envio',
    icon: 'FileText'
  },
  {
    value: 'in_transit',
    label: '📦 Em Trânsito',
    description: 'Dispara quando o objeto está em trânsito',
    icon: 'Package'
  },
  {
    value: 'out_for_delivery',
    label: '🚚 Saiu para Entrega',
    description: 'Dispara quando o pedido sai para entrega',
    icon: 'Truck'
  },
  {
    value: 'available_for_pickup',
    label: '📍 Disponível para Retirada',
    description: 'Dispara quando o pedido está disponível para retirada',
    icon: 'MapPin'
  },
  {
    value: 'delivered',
    label: '✅ Entregue',
    description: 'Dispara quando o pedido é entregue ao destinatário',
    icon: 'CheckCircle2'
  },
  {
    value: 'failed_attempt',
    label: '⚠️ Tentativa Falhou',
    description: 'Dispara quando há uma tentativa de entrega sem sucesso',
    icon: 'AlertTriangle'
  },
  {
    value: 'exception',
    label: '❌ Exceção',
    description: 'Dispara quando há um problema ou exceção na entrega',
    icon: 'AlertCircle'
  },
  {
    value: 'pending',
    label: '⏳ Pendente',
    description: 'Dispara quando o pedido está aguardando processamento',
    icon: 'Clock'
  },
  {
    value: 'expired',
    label: '⏰ Rastreamento Expirado',
    description: 'Dispara quando o rastreamento expira sem conclusão',
    icon: 'Clock'
  }
];
