export type NotificationTrigger = 
  | 'status_update'
  | 'delivery'
  | 'out_for_delivery'
  | 'exception';

export interface MessageTemplate {
  id: string;
  customer_id: string;
  name: string;
  notification_type: NotificationTrigger;
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
}

export const TEMPLATE_VARIABLES: TemplateVariable[] = [
  {
    label: 'Nome do Cliente',
    variable: '{{cliente_nome}}',
    description: 'Nome completo do cliente',
    example: 'João Silva'
  },
  {
    label: 'Código de Rastreio',
    variable: '{{tracking_code}}',
    description: 'Código de rastreamento do pedido',
    example: 'BR123456789'
  },
  {
    label: 'Status',
    variable: '{{status}}',
    description: 'Status atual do pedido',
    example: 'Em trânsito'
  },
  {
    label: 'Transportadora',
    variable: '{{transportadora}}',
    description: 'Nome da transportadora',
    example: 'Correios'
  },
  {
    label: 'Localização',
    variable: '{{localizacao}}',
    description: 'Última localização conhecida',
    example: 'São Paulo - SP'
  },
  {
    label: 'Data Atualização',
    variable: '{{data_atualizacao}}',
    description: 'Data e hora da última atualização',
    example: '25/10/2025 14:30'
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
    value: 'status_update',
    label: 'Atualização de Status',
    description: 'Qualquer mudança no status',
    icon: 'Package'
  },
  {
    value: 'out_for_delivery',
    label: 'Saiu para Entrega',
    description: 'Quando pedido sai para entrega',
    icon: 'Truck'
  },
  {
    value: 'delivery',
    label: 'Pedido Entregue',
    description: 'Quando pedido é entregue',
    icon: 'CheckCircle2'
  },
  {
    value: 'exception',
    label: 'Exceção/Problema',
    description: 'Quando há algum problema',
    icon: 'AlertCircle'
  }
];
