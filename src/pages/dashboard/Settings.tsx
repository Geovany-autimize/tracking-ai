import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import IntegrationCard from '@/components/settings/IntegrationCard';
import { useWhatsApp } from '@/hooks/use-whatsapp';
import PageHeader from '@/components/app/PageHeader';
import { formatE164WithCountry } from '@/lib/phone';

export default function SettingsPage() {
  const { status, instanceData } = useWhatsApp();
  const whatsappStatus = status === 'connected' ? 'ativo' : 'nao-configurado';

  const whatsappDescription = (() => {
    if (status === 'connected' && instanceData?.ownerJid) {
      const number = instanceData.ownerJid.split('@')[0];
      const formatted = number ? formatE164WithCountry(number) : null;
      if (formatted) {
        return `Conectado como ${formatted}`;
      }
    }
    if (status === 'connected' && instanceData?.profileName) {
      return `Conectado como ${instanceData.profileName}`;
    }
    return 'Envie notificações de rastreio para seus clientes';
  })();
  
  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações"
        description="Gerencie integrações e preferências da conta"
      />

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
              brand="whatsapp"
              title="WhatsApp"
              description={whatsappDescription}
              status={whatsappStatus}
              href="/dashboard/settings/integrations/whatsapp"
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                <IntegrationCard
                  brand="bling"
                  title="Bling"
                  description="Sincronize pedidos e notas fiscais"
                  status="nao-configurado"
                  href="/dashboard/settings/integrations/bling"
                />
                <IntegrationCard
                  brand="tiny"
                  title="Tiny"
                  description="Integração nativa com pedidos"
                  status="nao-configurado"
                  href="/dashboard/settings/integrations/tiny"
                />
                <IntegrationCard
                  brand="shopify"
                  title="Shopify"
                  description="Conecte sua loja Shopify"
                  status="nao-configurado"
                  href="/dashboard/settings/integrations/shopify"
                />
                <IntegrationCard
                  brand="mercado-livre"
                  title="Mercado Livre"
                  description="Pedidos e rastreios do ML"
                  status="nao-configurado"
                  href="/dashboard/settings/integrations/mercado-livre"
                />
                <IntegrationCard
                  brand="shopee"
                  title="Shopee"
                  description="Rastreio e atualização de status"
                  status="nao-configurado"
                  href="/dashboard/settings/integrations/shopee"
                />
                <IntegrationCard
                  brand="shein"
                  title="Shein"
                  description="Importe pedidos da Shein"
                  status="nao-configurado"
                  href="/dashboard/settings/integrations/shein"
                />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
