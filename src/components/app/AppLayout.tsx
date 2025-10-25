import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { NotificationsProvider } from '@/contexts/NotificationsContext';

export default function AppLayout() {
  const { customer, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !customer) {
      navigate('/login');
    }
  }, [customer, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!customer) {
    return null;
  }

  return (
    <NotificationsProvider>
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background">
          <AppSidebar />
          <main className="flex-1 p-4 md:p-6">
            <Outlet />
          </main>
        </div>
      </SidebarProvider>
    </NotificationsProvider>
  );
}
