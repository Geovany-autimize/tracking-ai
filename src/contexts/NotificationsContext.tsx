import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Notification } from '@/types/notifications';
import { toast } from '@/hooks/use-toast';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useAuth } from '@/contexts/AuthContext';

interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  soundEnabled: boolean;
  toggleSound: () => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const stored = localStorage.getItem('notifications_sound_enabled');
    return stored ? stored === 'true' : true;
  });
  const audioContextRef = useRef<AudioContext | null>(null);
  const hasInteractedRef = useRef(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const pollingRef = useRef<number | null>(null);
  const { customer } = useAuth();

  useEffect(() => {
    const ensureContext = () => {
      if (!audioContextRef.current) {
        try {
          audioContextRef.current = new AudioContext();
        } catch (error) {
          console.warn('WebAudio API not available for notification sounds', error);
        }
      }
    };

    ensureContext();

    const markInteraction = async () => {
      hasInteractedRef.current = true;
      ensureContext();
      try {
        if (audioContextRef.current?.state === 'suspended') {
          await audioContextRef.current.resume();
        }
      } catch (error) {
        console.warn('Unable to resume audio context on interaction', error);
      }
      window.removeEventListener('pointerdown', markInteraction);
      window.removeEventListener('keydown', markInteraction);
    };

    window.addEventListener('pointerdown', markInteraction, { once: true });
    window.addEventListener('keydown', markInteraction, { once: true });

    return () => {
      window.removeEventListener('pointerdown', markInteraction);
      window.removeEventListener('keydown', markInteraction);
    };
  }, []);

  const playNotificationSound = () => {
    if (!soundEnabled || !hasInteractedRef.current) {
      return;
    }

    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new AudioContext();
      } catch (error) {
        console.warn('WebAudio API not available for notification sounds', error);
        return;
      }
    }

    const ctx = audioContextRef.current;
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume()
        .then(() => {
          if (audioContextRef.current?.state === 'running') {
            setTimeout(() => playNotificationSound(), 20);
          }
        })
        .catch((error) => {
          console.warn('Unable to resume audio context before playing sound', error);
        });
      return;
    }

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = 'square';
    oscillator.frequency.value = 880;
    gain.gain.value = 0.001;

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.25, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.04, now + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    oscillator.frequency.setValueAtTime(660, now + 0.2);
    oscillator.frequency.exponentialRampToValueAtTime(990, now + 0.35);

    oscillator.start(now);
    oscillator.stop(now + 0.36);
  };

  const fetchNotifications = async () => {
    try {
      if (!customer?.id) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const typedData = data as Notification[];
      setNotifications(typedData);
      setUnreadCount(typedData.filter(n => !n.is_read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível marcar a notificação como lida',
        variant: 'destructive',
      });
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
      
      if (unreadIds.length === 0) return;

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', unreadIds);

      if (error) throw error;

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);

      toast({
        title: 'Sucesso',
        description: 'Todas as notificações foram marcadas como lidas',
      });
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível marcar todas como lidas',
        variant: 'destructive',
      });
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const notification = notifications.find(n => n.id === notificationId);
      
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      if (notification && !notification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível deletar a notificação',
        variant: 'destructive',
      });
    }
  };

  const clearAllNotifications = async () => {
    try {
      const notificationIds = notifications.map(n => n.id);
      
      if (notificationIds.length === 0) return;

      const { error } = await supabase
        .from('notifications')
        .delete()
        .in('id', notificationIds);

      if (error) throw error;

      setNotifications([]);
      setUnreadCount(0);

      toast({
        title: 'Sucesso',
        description: 'Todas as notificações foram removidas',
      });
    } catch (error) {
      console.error('Error clearing all notifications:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível limpar as notificações',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    const unsubscribeChannel = () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };

    if (!customer?.id) {
      unsubscribeChannel();
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return () => {};
    }

    const registerRealtime = () => {
      unsubscribeChannel();

      const channel = supabase
        .channel(`notifications-changes-${customer.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `customer_id=eq.${customer.id}`,
          },
          (payload) => {
            const newNotification = payload.new as Notification;
            setNotifications(prev => {
              const next = [newNotification, ...prev];
              setUnreadCount(next.filter(n => !n.is_read).length);
              return next;
            });

            toast({
              title: newNotification.title,
              description: newNotification.message,
            });

            playNotificationSound();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `customer_id=eq.${customer.id}`,
          },
          (payload) => {
            const updated = payload.new as Notification;
            setNotifications(prev => {
              const next = prev.map(n => (n.id === updated.id ? updated : n));
              setUnreadCount(next.filter(n => !n.is_read).length);
              return next;
            });
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'notifications',
            filter: `customer_id=eq.${customer.id}`,
          },
          (payload) => {
            const deleted = payload.old as Notification;
            setNotifications(prev => {
              const next = prev.filter(n => n.id !== deleted.id);
              setUnreadCount(next.filter(n => !n.is_read).length);
              return next;
            });
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.info('[notifications] realtime subscribed');
          }
        });

      channelRef.current = channel;
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchNotifications();
      }
    };

    const startPolling = () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
      pollingRef.current = window.setInterval(() => {
        if (document.visibilityState === 'visible') {
          fetchNotifications();
        }
      }, 60000);
    };

    setLoading(true);
    fetchNotifications();
    registerRealtime();
    document.addEventListener('visibilitychange', handleVisibility);
    startPolling();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      unsubscribeChannel();
    };
  }, [customer?.id]);

  const toggleSound = () => {
    setSoundEnabled(prev => {
      const next = !prev;
      localStorage.setItem('notifications_sound_enabled', String(next));
      if (next && audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume().catch((error) => {
          console.warn('Unable to resume audio context after enabling sound', error);
        });
      }
      return next;
    });
  };

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAllNotifications,
        refreshNotifications: fetchNotifications,
        soundEnabled,
        toggleSound,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
}
