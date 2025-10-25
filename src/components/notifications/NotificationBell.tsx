import { Bell } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useNotifications } from '@/contexts/NotificationsContext';
import { NotificationsPanel } from './NotificationsPanel';
import { SidebarMenuButton, useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

export function NotificationBell() {
  const { unreadCount } = useNotifications();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  return (
    <Popover>
      <SidebarMenuButton
        asChild
        tooltip="Notificações"
        size="lg"
        className={cn(
          "relative transition-all duration-200 h-12",
          collapsed && "mx-auto justify-center"
        )}
      >
        <PopoverTrigger>
          <Bell className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Notificações</span>}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs font-medium flex items-center justify-center animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </PopoverTrigger>
      </SidebarMenuButton>
      <PopoverContent className="w-[400px] p-0" align="start" side="right">
        <NotificationsPanel />
      </PopoverContent>
    </Popover>
  );
}
