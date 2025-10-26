import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import IntegrationCard from '@/components/settings/IntegrationCard';
import { useWhatsApp } from '@/hooks/use-whatsapp';

export default function SettingsPage() {
  const { status, instanceData } = useWhatsApp();
  const whatsappStatus = status === 'connected' ? 'ativo' : 'nao-configurado';
  
  return (
    <div className="space-y-6 max-w-6xl">
      <header>
        <h2 className="text-2xl font-semibold">Configurações</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie integrações e preferências da conta
        </p>
      </header>

      <div className="space-y-6">
        {/* Disparo de Mensagens */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Disparo de Mensagens</CardTitle>
            <CardDescription>
              Configure canais de comunicação com seus clientes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <IntegrationCard
              title="WhatsApp"
              description={
                status === 'connected' && instanceData?.profileName
                  ? `Conectado como ${instanceData.profileName}`
                  : 'Envie notificações de rastreio para seus clientes'
              }
              status={whatsappStatus}
              href="/dashboard/settings/integrations/whatsapp"
              logoUrl="/logos/whatsapp.png"
            />
          </CardContent>
        </Card>

        {/* Plataformas de E-commerce */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Plataformas de E-commerce</CardTitle>
            <CardDescription>
              Sincronize pedidos e atualize rastreios automaticamente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <IntegrationCard
                  title="Bling"
                  description="Sincronize pedidos e notas fiscais"
                  status="nao-configurado"
                  href="/dashboard/settings/integrations/bling"
                  logoUrl="/logos/bling.svg"
                />
                <IntegrationCard
                  title="Tiny"
                  description="Integração nativa com pedidos"
                  status="nao-configurado"
                  href="/dashboard/settings/integrations/tiny"
                  logoUrl="/logos/tiny.jpg"
                />
                <IntegrationCard
                  title="Shopify"
                  description="Conecte sua loja Shopify"
                  status="nao-configurado"
                  href="/dashboard/settings/integrations/shopify"
                  logoUrl="/logos/shopify.png"
                />
                <IntegrationCard
                  title="Mercado Livre"
                  description="Pedidos e rastreios do ML"
                  status="nao-configurado"
                  href="/dashboard/settings/integrations/mercado-livre"
                  logoUrl="/logos/mercado-livre.png"
                />
                <IntegrationCard
                  title="Shopee"
                  description="Rastreio e atualização de status"
                  status="nao-configurado"
                  href="/dashboard/settings/integrations/shopee"
                  logoUrl="/logos/shopee.png"
                />
                <IntegrationCard
                  title="Shein"
                  description="Importe pedidos da Shein"
                  status="nao-configurado"
                  href="/dashboard/settings/integrations/shein"
                  logoUrl="/logos/shein.png"
                />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
