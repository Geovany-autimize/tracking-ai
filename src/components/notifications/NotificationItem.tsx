import { Notification } from '@/types/notifications';
import { useNotifications } from '@/contexts/NotificationsContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { X, Package, CheckCircle, AlertCircle, Truck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface NotificationItemProps {
  notification: Notification;
}

export function NotificationItem({ notification }: NotificationItemProps) {
  const { deleteNotification } = useNotifications();
  const navigate = useNavigate();

  const handleClick = async () => {
    await deleteNotification(notification.id);
    navigate(`/dashboard/shipments/${notification.shipment_id}`);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteNotification(notification.id);
  };

  const getIcon = () => {
    switch (notification.notification_type) {
      case 'delivery':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'exception':
        return <AlertCircle className="h-5 w-5 text-destructive" />;
      case 'out_for_delivery':
        return <Truck className="h-5 w-5 text-blue-500" />;
      default:
        return <Package className="h-5 w-5 text-primary" />;
    }
  };

  const timeAgo = formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: true,
    locale: ptBR,
  });

  return (
    <div
      onClick={handleClick}
      className={cn(
        'flex gap-3 p-4 cursor-pointer transition-colors border-b hover:bg-muted/50',
        !notification.is_read && 'bg-primary/5'
      )}
    >
      <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h4
            className={cn(
              'text-sm leading-tight',
              !notification.is_read && 'font-semibold'
            )}
          >
            {notification.title}
          </h4>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 flex-shrink-0 hover:bg-destructive/10"
            onClick={handleDelete}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
        
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
          {notification.message}
        </p>
        
        <div className="flex items-center gap-2 text-xs">
          <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">
            {notification.tracking_code}
          </code>
          <span className="text-muted-foreground/70">•</span>
          <span className="text-muted-foreground/70">{timeAgo}</span>
        </div>
      </div>
    </div>
  );
}
