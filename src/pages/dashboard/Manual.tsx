import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Bell, MessageSquare, Zap, TrendingUp, Shield, Users, Activity } from 'lucide-react';
import PageHeader from '@/components/app/PageHeader';

export default function Manual() {
  const features = [
    {
      icon: Package,
      title: 'Rastreamento Automático',
      description: 'Monitore automaticamente todos os seus pedidos com atualizações em tempo real de diversas transportadoras.',
    },
    {
      icon: Bell,
      title: 'Notificações Inteligentes',
      description: 'Receba alertas instantâneos sobre mudanças de status, atrasos e entregas bem-sucedidas.',
    },
    {
      icon: MessageSquare,
      title: 'WhatsApp Integrado',
      description: 'Envie atualizações automáticas para seus clientes via WhatsApp com templates personalizados.',
    },
    {
      icon: Zap,
      title: 'Integrações Poderosas',
      description: 'Conecte-se com Bling, Shopify, Mercado Livre e outras plataformas para importar pedidos automaticamente.',
    },
    {
      icon: TrendingUp,
      title: 'Insights e Analytics',
      description: 'Analise o desempenho das transportadoras, identifique problemas e otimize seu processo logístico.',
    },
    {
      icon: Shield,
      title: 'Segurança e Confiabilidade',
      description: 'Seus dados protegidos com criptografia de ponta a ponta e backups automáticos.',
    },
  ];

  const howItWorks = [
    {
      step: '1',
      title: 'Adicione seus pedidos',
      description: 'Importe pedidos manualmente, via CSV ou conecte suas plataformas de e-commerce.',
    },
    {
      step: '2',
      title: 'Rastreamento automático',
      description: 'O sistema busca atualizações automaticamente em tempo real de todas as transportadoras.',
    },
    {
      step: '3',
      title: 'Notifique seus clientes',
      description: 'Configure templates e envie atualizações automáticas via WhatsApp para seus clientes.',
    },
    {
      step: '4',
      title: 'Analise e otimize',
      description: 'Use nossos insights para identificar problemas, melhorar prazos e aumentar a satisfação.',
    },
  ];

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Manual do Tracking AI"
        description="Aprenda como usar todas as funcionalidades da plataforma"
      />

      <div className="container mx-auto px-4 py-8 space-y-12 max-w-6xl">
        {/* Introdução */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Activity className="h-6 w-6 text-primary" />
                O que é o Tracking AI?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>
                O Tracking AI é uma plataforma completa de gestão de rastreamento de pedidos que automatiza todo o processo
                de acompanhamento logístico do seu e-commerce. Com inteligência artificial e integrações poderosas, você
                mantém seus clientes informados e reduz drasticamente o volume de tickets de suporte.
              </p>
              <p>
                Nossa solução foi desenvolvida para lojistas que buscam profissionalizar o pós-venda, melhorar a experiência
                do cliente e ganhar insights valiosos sobre seu processo logístico.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Principais Funcionalidades */}
        <section>
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">Principais Funcionalidades</h2>
            <p className="text-muted-foreground">
              Conheça os recursos que tornam o Tracking AI essencial para seu e-commerce
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Como Funciona */}
        <section>
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">Como Funciona</h2>
            <p className="text-muted-foreground">
              Siga estes passos simples para começar a usar o Tracking AI
            </p>
          </div>

          <div className="space-y-6">
            {howItWorks.map((step, index) => (
              <Card key={index} className="overflow-hidden">
                <CardHeader className="bg-muted/30">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg shrink-0">
                      {step.step}
                    </div>
                    <div>
                      <CardTitle className="text-xl mb-2">{step.title}</CardTitle>
                      <CardDescription className="text-base">{step.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        {/* Gestão de Rastreios */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Package className="h-6 w-6 text-primary" />
                Gestão de Rastreios
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Adicionar Rastreios</h3>
                <p>Você pode adicionar rastreios de três formas diferentes:</p>
                <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                  <li><strong>Manual:</strong> Adicione um rastreio por vez através do formulário</li>
                  <li><strong>Importação em lote:</strong> Importe vários rastreios de uma vez usando arquivo CSV</li>
                  <li><strong>Integrações:</strong> Conecte sua loja (Bling, Shopify, etc.) para importação automática</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Acompanhamento</h3>
                <p>
                  Uma vez adicionado, o sistema busca atualizações automaticamente a cada 4 horas. Você pode acompanhar
                  o status em tempo real, ver o histórico completo de movimentações e receber notificações sobre mudanças importantes.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Templates de WhatsApp */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <MessageSquare className="h-6 w-6 text-primary" />
                Templates de WhatsApp
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>
                Configure mensagens personalizadas para serem enviadas automaticamente para seus clientes quando
                determinados eventos acontecerem (ex: saiu para entrega, pedido entregue, tentativa de entrega falhou).
              </p>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Variáveis Disponíveis</h3>
                <p>Use essas variáveis em seus templates para personalizar as mensagens:</p>
                <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                  <li><code className="bg-muted px-1 py-0.5 rounded">{'{{nome}}'}</code> - Nome do cliente</li>
                  <li><code className="bg-muted px-1 py-0.5 rounded">{'{{codigo}}'}</code> - Código de rastreamento</li>
                  <li><code className="bg-muted px-1 py-0.5 rounded">{'{{status}}'}</code> - Status atual do pedido</li>
                  <li><code className="bg-muted px-1 py-0.5 rounded">{'{{transportadora}}'}</code> - Nome da transportadora</li>
                  <li><code className="bg-muted px-1 py-0.5 rounded">{'{{localizacao}}'}</code> - Última localização conhecida</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Integrações */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Zap className="h-6 w-6 text-primary" />
                Configurar Integrações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>
                Conecte suas plataformas favoritas para automatizar completamente o processo de rastreamento.
                Acesse <strong>Configurações → Integrações</strong> para conectar:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="border border-border rounded-lg p-4">
                  <h4 className="font-semibold text-foreground mb-2">Bling</h4>
                  <p className="text-sm">
                    Importe pedidos automaticamente do Bling com todos os dados de rastreamento e cliente.
                  </p>
                </div>

                <div className="border border-border rounded-lg p-4">
                  <h4 className="font-semibold text-foreground mb-2">WhatsApp Business</h4>
                  <p className="text-sm">
                    Conecte sua conta do WhatsApp Business para enviar mensagens automatizadas aos clientes.
                  </p>
                </div>

                <div className="border border-border rounded-lg p-4 opacity-60">
                  <h4 className="font-semibold text-foreground mb-2">Shopify (Em breve)</h4>
                  <p className="text-sm">
                    Em desenvolvimento - importe pedidos da sua loja Shopify automaticamente.
                  </p>
                </div>

                <div className="border border-border rounded-lg p-4 opacity-60">
                  <h4 className="font-semibold text-foreground mb-2">Mercado Livre (Em breve)</h4>
                  <p className="text-sm">
                    Em desenvolvimento - sincronize suas vendas do Mercado Livre.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Suporte */}
        <section>
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Users className="h-6 w-6 text-primary" />
                Precisa de Ajuda?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-muted-foreground">
                Nossa equipe está pronta para ajudar você a aproveitar ao máximo o Tracking AI.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href="https://wa.me/5511999999999"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
                >
                  Falar com Suporte
                </a>
                <a
                  href="mailto:suporte@trackingai.com.br"
                  className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  Enviar E-mail
                </a>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
