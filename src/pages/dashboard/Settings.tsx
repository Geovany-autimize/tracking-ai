import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare } from 'lucide-react';
import IntegrationCard from '@/components/settings/IntegrationCard';
import { useWhatsApp } from '@/hooks/use-whatsapp';
import { useSearchParams } from 'react-router-dom';

export default function SettingsPage() {
  const { status, instanceData } = useWhatsApp();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'integrations';

  const whatsappStatus = status === 'connected' ? 'ativo' : 'nao-configurado';
  
  return (
    <div className="space-y-6 max-w-6xl">
      <header>
        <h2 className="text-2xl font-semibold">Configurações</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie integrações e preferências da conta
        </p>
      </header>

      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="integrations">Integrações</TabsTrigger>
          <TabsTrigger value="billing">Faturamento</TabsTrigger>
        </TabsList>

        <TabsContent value="integrations" className="space-y-6">
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
                icon={<MessageSquare className="h-5 w-5" />}
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
                    logoUrl="/logos/tiny.svg"
                  />
                  <IntegrationCard
                    title="Shopify"
                    description="Conecte sua loja Shopify"
                    status="nao-configurado"
                    href="/dashboard/settings/integrations/shopify"
                    logoUrl="/logos/shopify.svg"
                  />
                  <IntegrationCard
                    title="Mercado Livre"
                    description="Pedidos e rastreios do ML"
                    status="nao-configurado"
                    href="/dashboard/settings/integrations/mercado-livre"
                    logoUrl="/logos/mercado-livre.svg"
                  />
                  <IntegrationCard
                    title="Shopee"
                    description="Rastreio e atualização de status"
                    status="nao-configurado"
                    href="/dashboard/settings/integrations/shopee"
                    logoUrl="/logos/shopee.svg"
                  />
                  <IntegrationCard
                    title="Shein"
                    description="Importe pedidos da Shein"
                    status="nao-configurado"
                    href="/dashboard/settings/integrations/shein"
                    logoUrl="/logos/shein.svg"
                  />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Faturamento</CardTitle>
              <CardDescription>
                Gerencie seu plano e forma de pagamento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border bg-muted/50 p-6 text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  Gerencie seu plano e forma de pagamento (Em breve)
                </p>
                <div className="flex justify-center gap-3">
                  <Button variant="outline" disabled>Ver planos</Button>
                  <Button variant="outline" disabled>Histórico de cobranças</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
