import { useNotifications } from '@/contexts/NotificationsContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { NotificationItem } from './NotificationItem';
import { Bell, CheckCheck, Volume2, VolumeX } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function NotificationsPanel() {
  const { notifications, clearAllNotifications, loading, soundEnabled, toggleSound } = useNotifications();

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
      <div className="flex items-center justify-between gap-3 p-4 pb-3">
        <h3 className="font-semibold text-lg">Notificações</h3>
        <div className="flex items-center gap-1.5">
          <TooltipProvider delayDuration={250}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={toggleSound}
                >
                  {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <p>{soundEnabled ? 'Desativar som' : 'Ativar som'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {notifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllNotifications}
              className="text-xs h-8 gap-1"
            >
              <CheckCheck className="h-3 w-3" />
              Limpar notificações
            </Button>
          )}
        </div>
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
