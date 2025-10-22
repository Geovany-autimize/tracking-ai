import { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

function getPageTitle(pathname: string) {
  if (pathname === '/dashboard') return 'Início';
  if (pathname.startsWith('/dashboard/shipments')) return 'Rastreios';
  if (pathname.startsWith('/dashboard/customers')) return 'Clientes';
  if (pathname.startsWith('/dashboard/insights')) return 'Insights';
  if (pathname.startsWith('/dashboard/settings')) return 'Configurações';
  if (pathname.startsWith('/dashboard/profile')) return 'Perfil';
  return 'Dashboard';
}

export default function AppLayout() {
  const { customer, loading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const pageTitle = getPageTitle(location.pathname);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-14 items-center gap-4 px-4">
              <SidebarTrigger />
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">/</span>
                <h1 className="text-sm font-medium">{pageTitle}</h1>
              </div>
              <div className="ml-auto flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Sair
                </Button>
              </div>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
