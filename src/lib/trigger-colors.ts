import { NotificationTrigger } from '@/types/templates';

export const getTriggerVariant = (trigger: NotificationTrigger): 'default' | 'secondary' | 'destructive' | 'outline' => {
  const variantMap: Record<NotificationTrigger, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    info_received: 'default',
    in_transit: 'default',
    out_for_delivery: 'secondary',
    available_for_pickup: 'secondary',
    delivered: 'outline',
    failed_attempt: 'destructive',
    exception: 'destructive',
    pending: 'secondary',
    expired: 'secondary',
  };
  
  return variantMap[trigger] || 'secondary';
};

export const getTriggerColorClass = (trigger: NotificationTrigger): string => {
  const colorMap: Record<NotificationTrigger, string> = {
    info_received: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    in_transit: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
    out_for_delivery: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    available_for_pickup: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
    delivered: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    failed_attempt: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    exception: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
    expired: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
  };
  
  return colorMap[trigger] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
};
