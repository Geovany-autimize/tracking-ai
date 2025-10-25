import { NotificationTrigger } from '@/types/templates';

export const getTriggerVariant = (trigger: NotificationTrigger): 'default' | 'secondary' | 'destructive' | 'outline' => {
  const variantMap: Record<NotificationTrigger, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    status_update: 'default', // Azul - informativo
    out_for_delivery: 'secondary', // Cinza - neutro
    delivery: 'outline', // Verde seria ideal mas usamos outline
    exception: 'destructive', // Vermelho - alerta
  };
  
  return variantMap[trigger] || 'secondary';
};

export const getTriggerColorClass = (trigger: NotificationTrigger): string => {
  const colorMap: Record<NotificationTrigger, string> = {
    status_update: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    out_for_delivery: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
    delivery: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    exception: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  };
  
  return colorMap[trigger] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
};
