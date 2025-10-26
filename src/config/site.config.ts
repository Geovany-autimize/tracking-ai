export const SITE = {
  name: "TrackingAI",
  logoText: "TrackingAI",
  appUrl: "/login",
  nav: [
    { label: "Benefícios", href: "#beneficios" },
    { label: "Como funciona", href: "#como-funciona" },
    { label: "Recursos", href: "#features" },
    { label: "Integrações", href: "#integracoes" },
    { label: "Preços", href: "#precos" },
    { label: "FAQ", href: "#faq" },
  ],
  whatsappSales: "https://wa.me/5511999999999?text=Quero%20conhecer%20o%20plano%20Enterprise",
} as const;

export const APP_NAV = [
  { label: 'Início', href: '/dashboard', icon: 'LayoutDashboard' },
  { label: 'Rastreios', href: '/dashboard/shipments', icon: 'PackageSearch' },
  { label: 'Clientes', href: '/dashboard/customers', icon: 'Users' },
  { label: 'Insights', href: '/dashboard/insights', icon: 'Sparkles' },
  { label: 'Templates', href: '/dashboard/templates', icon: 'MessageSquare' },
  { label: 'Planos', href: '/dashboard/billing', icon: 'CreditCard' },
  { label: 'Configurações', href: '/dashboard/settings', icon: 'Settings' },
  { label: 'Perfil', href: '/dashboard/profile', icon: 'User' },
] as const;
