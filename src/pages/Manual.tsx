import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Bell, MessageSquare, Zap, TrendingUp, Shield, Activity, BookOpen, Mail } from 'lucide-react';
import { Navbar } from '@/components/ui/Navbar';
import { Footer } from '@/components/landing/Footer';
import { Button } from '@/components/ui/button';

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
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4 text-center max-w-4xl">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
            <BookOpen className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Manual do Tracking AI
          </h1>
          <p className="text-xl text-muted-foreground">
            Aprenda como usar todas as funcionalidades da plataforma e automatize completamente seu rastreamento de pedidos
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-16 space-y-16 max-w-6xl">
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
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-3">Principais Funcionalidades</h2>
            <p className="text-lg text-muted-foreground">
              Conheça os recursos que tornam o Tracking AI essencial para seu e-commerce
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <feature.icon className="h-10 w-10 text-primary mb-2" />
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Como Funciona */}
        <section>
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-3">Como Funciona</h2>
            <p className="text-lg text-muted-foreground">
              Comece a usar o Tracking AI em 4 passos simples
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {howItWorks.map((item) => (
              <Card key={item.step} className="relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full flex items-start justify-end p-4">
                  <span className="text-4xl font-bold text-primary/20">{item.step}</span>
                </div>
                <CardHeader>
                  <CardTitle className="text-xl">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Gestão de Rastreios */}
        <section>
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-3">Gestão de Rastreios</h2>
            <p className="text-lg text-muted-foreground">
              Gerencie todos os seus pedidos em um só lugar
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Como Adicionar Rastreios</CardTitle>
              <CardDescription>Existem três formas de adicionar pedidos ao sistema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">1. Adicionar Manualmente</h3>
                <p className="text-muted-foreground">
                  Use o formulário de criação de rastreio para adicionar pedidos um a um. Ideal para volumes baixos
                  ou pedidos específicos.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-lg">2. Importar via CSV</h3>
                <p className="text-muted-foreground">
                  Importe múltiplos pedidos de uma vez usando arquivos CSV. O sistema oferece um mapeamento inteligente
                  de colunas e validação automática dos dados.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-lg">3. Integrações Automáticas</h3>
                <p className="text-muted-foreground">
                  Conecte suas plataformas de e-commerce (Bling, Shopify, etc.) e os pedidos serão importados
                  automaticamente conforme são criados. Configure uma vez e esqueça!
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Templates de WhatsApp */}
        <section>
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-3">Templates de WhatsApp</h2>
            <p className="text-lg text-muted-foreground">
              Configure mensagens personalizadas para cada etapa da entrega
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Variáveis Disponíveis</CardTitle>
              <CardDescription>Use essas variáveis nos seus templates para personalizar as mensagens</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <code className="bg-muted px-2 py-1 rounded text-sm">{'{{cliente_nome}}'}</code>
                  <p className="text-sm text-muted-foreground">Nome do cliente</p>
                </div>
                <div className="space-y-2">
                  <code className="bg-muted px-2 py-1 rounded text-sm">{'{{codigo_rastreio}}'}</code>
                  <p className="text-sm text-muted-foreground">Código de rastreamento</p>
                </div>
                <div className="space-y-2">
                  <code className="bg-muted px-2 py-1 rounded text-sm">{'{{transportadora}}'}</code>
                  <p className="text-sm text-muted-foreground">Nome da transportadora</p>
                </div>
                <div className="space-y-2">
                  <code className="bg-muted px-2 py-1 rounded text-sm">{'{{status}}'}</code>
                  <p className="text-sm text-muted-foreground">Status atual do pedido</p>
                </div>
                <div className="space-y-2">
                  <code className="bg-muted px-2 py-1 rounded text-sm">{'{{localizacao}}'}</code>
                  <p className="text-sm text-muted-foreground">Localização atual</p>
                </div>
                <div className="space-y-2">
                  <code className="bg-muted px-2 py-1 rounded text-sm">{'{{data_atualizacao}}'}</code>
                  <p className="text-sm text-muted-foreground">Data da última atualização</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Integrações */}
        <section>
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-3">Integrações</h2>
            <p className="text-lg text-muted-foreground">
              Conecte suas plataformas favoritas
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Integrações Disponíveis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="font-medium">Bling</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                  <span className="font-medium">Shopify (em breve)</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                  <span className="font-medium">Mercado Livre (em breve)</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                  <span className="font-medium">Shopee (em breve)</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Como Configurar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-muted-foreground">
                  Acesse <strong>Configurações → Integrações</strong> e clique em "Conectar" na integração desejada.
                  Siga o processo de autorização e pronto! Seus pedidos começarão a ser importados automaticamente.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Suporte */}
        <section>
          <Card className="bg-primary/5 border-primary/10">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Mail className="h-6 w-6 text-primary" />
                Precisa de Ajuda?
              </CardTitle>
              <CardDescription>
                Nossa equipe está pronta para ajudar você a aproveitar ao máximo o Tracking AI
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <Button asChild>
                  <a 
                    href="https://wa.me/5511999999999?text=Olá,%20preciso%20de%20ajuda%20com%20o%20Tracking%20AI" 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    Falar no WhatsApp
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <a href="mailto:suporte@tracking-ai.com.br">
                    Enviar Email
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>

      <Footer />
    </div>
  );
}
