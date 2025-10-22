import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Store, Bell, Globe, CreditCard } from 'lucide-react';

function SettingSection({ 
  icon: Icon, 
  title, 
  description, 
  status, 
  action 
}: { 
  icon: any; 
  title: string; 
  description: string; 
  status?: string; 
  action: string;
}) {
  return (
    <div className="flex items-start justify-between p-4 border rounded-lg">
      <div className="flex gap-4">
        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium">{title}</h3>
            {status && (
              <Badge variant="outline" className="text-xs">
                {status}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <Button variant="outline" size="sm">
        {action}
      </Button>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-semibold">Configurações</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie integrações, notificações e preferências da conta
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Integrações</CardTitle>
          <CardDescription>
            Conecte sua loja para importar pedidos automaticamente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <SettingSection
            icon={Store}
            title="Integrações de E-commerce"
            description="Bling, Tiny, Nuvemshop, Shopify"
            status="Não configurado"
            action="Configurar"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notificações</CardTitle>
          <CardDescription>
            Configure como e quando receber alertas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <SettingSection
            icon={Bell}
            title="Preferências de Notificação"
            description="WhatsApp, E-mail, SMS"
            status="Ativo"
            action="Gerenciar"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Personalização</CardTitle>
          <CardDescription>
            Customize a experiência dos seus clientes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <SettingSection
            icon={Globe}
            title="Domínio e Branding"
            description="Use seu próprio domínio e identidade visual"
            status="Em breve"
            action="Configurar"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Faturamento</CardTitle>
          <CardDescription>
            Gerencie seu plano e forma de pagamento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <SettingSection
            icon={CreditCard}
            title="Assinatura e Pagamento"
            description="Altere seu plano ou método de pagamento"
            status="Free"
            action="Fazer Upgrade"
          />
        </CardContent>
      </Card>
    </div>
  );
}
