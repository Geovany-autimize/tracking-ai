import { useNotifications } from '@/contexts/NotificationsContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { NotificationItem } from './NotificationItem';
import { Bell, CheckCheck } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export function NotificationsPanel() {
  const { notifications, unreadCount, markAllAsRead, loading } = useNotifications();

  if (loading) {
    return (
      <div className="p-4">
        <p className="text-sm text-muted-foreground">Carregando notificações...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-3">
        <h3 className="font-semibold text-lg">Notificações</h3>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={markAllAsRead}
            className="text-xs h-8 gap-1"
          >
            <CheckCheck className="h-3 w-3" />
            Marcar todas como lidas
          </Button>
        )}
      </div>
      
      <Separator />

      {/* List */}
      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <Bell className="h-12 w-12 text-muted-foreground/50 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Nenhuma notificação</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Você será notificado sobre atualizações nos seus rastreamentos
          </p>
        </div>
      ) : (
        <ScrollArea className="h-[400px]">
          <div className="flex flex-col">
            {notifications.map((notification) => (
              <NotificationItem key={notification.id} notification={notification} />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
