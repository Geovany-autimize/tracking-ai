import { Link, useLocation, useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { LogOut } from 'lucide-react';
import { APP_NAV } from '@/config/site.config';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import Logo from './Logo';

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const collapsed = state === 'collapsed';

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(href);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const mainMenuItems = APP_NAV.filter(item => item.href !== '/dashboard/profile');
  const profileItem = APP_NAV.find(item => item.href === '/dashboard/profile');

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="flex flex-col h-full">
        {/* Logo no topo */}
        <div className="border-b border-sidebar-border">
          <div className="flex items-center justify-between p-4">
            {!collapsed ? (
              <div className="flex-1 min-w-0">
                <Logo variant="app" />
              </div>
            ) : (
              <Link to="/dashboard" className="flex items-center justify-center w-full">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-secondary shadow-lg cursor-pointer hover:scale-105 transition-transform" />
              </Link>
            )}
            {!collapsed && <SidebarTrigger className="ml-2 shrink-0" />}
          </div>
          {collapsed && (
            <div className="flex items-center justify-center pb-3">
              <SidebarTrigger className="shrink-0" />
            </div>
          )}
        </div>

        <SidebarGroup className="pt-4">
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainMenuItems.map((item) => {
                const Icon = (Icons[item.icon as keyof typeof Icons] || Icons.Circle) as any;
                const active = isActive(item.href);

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={active}>
                      <Link to={item.href}>
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="flex-1" />

        {profileItem && (
          <SidebarGroup className="mt-auto">
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive(profileItem.href)}>
                    <Link to={profileItem.href}>
                      {(() => {
                        const Icon = (Icons[profileItem.icon as keyof typeof Icons] || Icons.Circle) as any;
                        return <Icon className="h-4 w-4" />;
                      })()}
                      <span>{profileItem.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup className="mt-0">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleLogout}>
                  <LogOut className="h-4 w-4" />
                  <span>Sair</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {!collapsed && (
          <div className="px-4 pb-4 text-xs text-muted-foreground">
            © {new Date().getFullYear()} TrackingAI
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
