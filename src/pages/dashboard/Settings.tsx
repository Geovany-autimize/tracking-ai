import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, Store, ShoppingBag, ShoppingCart, Package } from 'lucide-react';
import IntegrationCard from '@/components/settings/IntegrationCard';
import { useWhatsApp } from '@/hooks/use-whatsapp';

export default function SettingsPage() {
  const { status, instanceData } = useWhatsApp();

  // Determinar o status do WhatsApp para o IntegrationCard
  const whatsappStatus = status === 'connected' ? 'ativo' : 'nao-configurado';
  
  return (
    <div className="space-y-8 max-w-6xl">
      <header>
        <h2 className="text-2xl font-semibold">Configurações</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie integrações e preferências da conta
        </p>
      </header>

      {/* Integrações */}
      <Card>
        <CardHeader>
          <CardTitle>Integrações</CardTitle>
          <CardDescription>
            Conecte plataformas para sincronizar pedidos e enviar notificações
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Disparo de Mensagens */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Disparo de Mensagens</h3>
            <IntegrationCard
              title="WhatsApp"
              description={
                status === 'connected' && instanceData?.profileName
                  ? `Conectado como ${instanceData.profileName}`
                  : 'Envie notificações de rastreio para seus clientes'
              }
              status={whatsappStatus}
              href="/dashboard/settings/integrations/whatsapp"
              icon={<MessageSquare className="h-5 w-5" />}
            />
          </div>

          {/* Plataformas */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Plataformas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              <IntegrationCard
                title="Bling"
                description="Sincronize pedidos e notas fiscais"
                status="nao-configurado"
                href="/dashboard/settings/integrations/bling"
                icon={<Store className="h-5 w-5" />}
              />
              <IntegrationCard
                title="Tiny"
                description="Integração nativa com pedidos"
                status="nao-configurado"
                href="/dashboard/settings/integrations/tiny"
                icon={<ShoppingBag className="h-5 w-5" />}
              />
              <IntegrationCard
                title="Shopify"
                description="Conecte sua loja Shopify"
                status="nao-configurado"
                href="/dashboard/settings/integrations/shopify"
                icon={<ShoppingCart className="h-5 w-5" />}
              />
              <IntegrationCard
                title="Mercado Livre"
                description="Pedidos e rastreios do ML"
                status="nao-configurado"
                href="/dashboard/settings/integrations/mercado-livre"
                icon={<Package className="h-5 w-5" />}
              />
              <IntegrationCard
                title="Shopee"
                description="Rastreio e atualização de status"
                status="nao-configurado"
                href="/dashboard/settings/integrations/shopee"
                icon={<ShoppingBag className="h-5 w-5" />}
              />
              <IntegrationCard
                title="Shein"
                description="Importe pedidos da Shein"
                status="nao-configurado"
                href="/dashboard/settings/integrations/shein"
                icon={<Store className="h-5 w-5" />}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Faturamento */}
      <Card>
        <CardHeader>
          <CardTitle>Faturamento</CardTitle>
          <CardDescription>
            Gerencie seu plano e forma de pagamento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border bg-muted/50 p-5">
            <p className="text-sm text-muted-foreground mb-3">
              Gerencie seu plano e forma de pagamento (Em breve)
            </p>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" disabled>Ver planos</Button>
              <Button variant="outline" disabled>Histórico de cobranças</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
