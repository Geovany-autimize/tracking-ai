import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useWhatsApp } from '@/hooks/use-whatsapp';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PackageSearch, Users, Sparkles, Settings, User, AlertCircle, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { ReactNode } from 'react';

function StatCard({ label, value, subtitle }: { label: string; value: string | ReactNode; subtitle?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

export default function DashboardHome() {
  const { customer, plan, usage } = useAuth();
  const { status: whatsappStatus, isChecking } = useWhatsApp();

  const totalCredits = plan?.monthly_credits || 0;
  const usedCredits = usage?.used_credits || 0;
  const isQuotaExceeded = usedCredits >= totalCredits;

  const getNextRenewalDate = () => {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return nextMonth.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  };

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-2xl font-semibold mb-4">
          Bem-vindo, {customer?.name || 'Usuário'}!
        </h2>
      </section>

      {isQuotaExceeded && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <div className="flex-1">
              <p className="font-medium">Limite de créditos atingido</p>
              <p className="text-sm text-muted-foreground">
                Faça upgrade do seu plano para continuar rastreando
              </p>
            </div>
            <Button asChild>
              <Link to="/dashboard/settings">Ver Planos</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <StatCard
          label="Plano Atual"
          value={
            <div className="flex items-center gap-2">
              <span>{plan?.name || 'Free'}</span>
              <Badge variant="outline" className="text-xs">
                {totalCredits} créditos/mês
              </Badge>
            </div>
          }
        />
        <StatCard
          label="Créditos Usados"
          value={`${usedCredits} / ${totalCredits}`}
          subtitle={`Renova em ${getNextRenewalDate()}`}
        />
        <StatCard label="Rastreios Ativos" value="12" subtitle="Aguardando entrega" />
        <StatCard 
          label="Taxa de Entrega"
          value="94.5%"
          subtitle="↑ 2.3% vs mês anterior"
        />
        <StatCard 
          label="Tempo Médio"
          value="7.2 dias"
          subtitle="Média de entrega"
        />
        <StatCard 
          label="Clientes Ativos"
          value="28"
          subtitle="Com rastreios no mês"
        />
        <StatCard 
          label="Taxa de Uso"
          value={`${totalCredits > 0 ? Math.round((usedCredits / totalCredits) * 100) : 0}%`}
          subtitle={`${totalCredits - usedCredits} créditos restantes`}
        />
        <StatCard label="Entregues neste mês" value="37" subtitle="Finalizados com sucesso" />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Atalhos Rápidos</CardTitle>
            <CardDescription>Acesse as principais funcionalidades</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              <Button asChild variant="outline" className="justify-start gap-2 h-auto py-3">
                <Link to="/dashboard/shipments">
                  <PackageSearch className="h-4 w-4" />
                  Ver Rastreios
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start gap-2 h-auto py-3">
                <Link to="/dashboard/customers">
                  <Users className="h-4 w-4" />
                  Clientes
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start gap-2 h-auto py-3">
                <Link to="/dashboard/insights">
                  <Sparkles className="h-4 w-4" />
                  Insights
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start gap-2 h-auto py-3">
                <Link to="/dashboard/settings">
                  <Settings className="h-4 w-4" />
                  Configurações
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start gap-2 h-auto py-3">
                <Link to="/dashboard/profile">
                  <User className="h-4 w-4" />
                  Meu Perfil
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status da Conta</CardTitle>
            <CardDescription>Complete sua configuração</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center justify-between">
                <span>E-mail verificado</span>
                <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                  Pendente
                </Badge>
              </li>
              <li className="flex items-center justify-between">
                <span>WhatsApp</span>
                {isChecking ? (
                  <Badge variant="outline">
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Verificando...
                  </Badge>
                ) : whatsappStatus === 'connected' ? (
                  <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Conectado
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
                    <XCircle className="h-3 w-3 mr-1" />
                    Desconectado
                  </Badge>
                )}
              </li>
              <li className="flex items-center justify-between">
                <span>Integração de loja</span>
                <Badge variant="outline">Não configurada</Badge>
              </li>
            </ul>
            <div className="space-y-2 mt-4">
              {whatsappStatus !== 'connected' && (
                <Button asChild variant="outline" className="w-full" size="sm">
                  <Link to="/dashboard/settings/integrations/whatsapp">
                    Configurar WhatsApp
                  </Link>
                </Button>
              )}
              <Button asChild variant="outline" className="w-full" size="sm">
                <Link to="/dashboard/settings">Completar Configuração</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
