import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, CheckCircle, AlertTriangle, Plus, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/hooks/use-credits";

export default function Dashboard() {
  const { customer, plan, loading, logout } = useAuth();
  const { totalCredits, monthlyUsed, monthlyCredits } = useCredits();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !customer) {
      navigate('/login');
    }
  }, [customer, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!customer || !plan) {
    return null;
  }

  const availableCredits = totalCredits || 0;
  const usedCredits = monthlyUsed || 0;
  const planCredits = monthlyCredits || 0;
  const isQuotaExceeded = availableCredits === 0;
  
  const nextReset = new Date();
  nextReset.setMonth(nextReset.getMonth() + 1);
  nextReset.setDate(1);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <h1 className="text-xl font-bold">TrackingAI</h1>
            </Link>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              Créditos: <span className="font-semibold text-foreground">{availableCredits}</span>
              <span className="ml-2">Usados: {usedCredits}/{planCredits}</span>
            </div>
            <Badge variant={plan.id === "premium" ? "default" : "secondary"}>
              {plan.name}
            </Badge>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <div className="container py-8 space-y-8">
        {/* Quota exceeded banner */}
        {isQuotaExceeded && (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-foreground">
                  Você atingiu o limite de créditos disponíveis
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Compre mais créditos ou assine o Premium para continuar rastreando sem interrupções.
                </p>
                <Button className="mt-3" asChild>
                  <a href="/#pricing">Ver Planos</a>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Welcome */}
        <div>
          <h2 className="text-3xl font-bold">Seu painel de rastreamento</h2>
          <p className="text-muted-foreground mt-2">
            Bem-vindo, {customer.name}
          </p>
        </div>

        {/* Stats cards */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Rastreamentos ativos</CardTitle>
              <Package className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12</div>
              <p className="text-xs text-muted-foreground">Em trânsito</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Entregues este mês</CardTitle>
              <CheckCircle className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">45</div>
              <p className="text-xs text-muted-foreground">Taxa de sucesso: 98%</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Alertas / Exceções</CardTitle>
              <AlertTriangle className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3</div>
              <p className="text-xs text-muted-foreground">Requerem atenção</p>
            </CardContent>
          </Card>
        </div>

        {/* CTA */}
        <Card>
          <CardHeader>
            <CardTitle>Criar novo rastreio</CardTitle>
            <CardDescription>
              Adicione um código de rastreio ou importe uma PLP para começar a monitorar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button disabled={isQuotaExceeded}>
              <Plus className="w-4 h-4 mr-2" />
              Criar rastreio
            </Button>
            {isQuotaExceeded && (
              <p className="text-sm text-muted-foreground mt-2">
                Você precisa de mais créditos para criar novos rastreios
              </p>
            )}
          </CardContent>
        </Card>

        {/* Sidebar info */}
        <div className="grid md:grid-cols-4 gap-6">
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Menu</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="ghost" className="w-full justify-start" asChild>
                <Link to="/dashboard">Rastreamentos</Link>
              </Button>
              <Button variant="ghost" className="w-full justify-start" disabled={plan.id === "free"}>
                Relatórios {plan.id === "free" && <Badge variant="secondary" className="ml-auto">Premium</Badge>}
              </Button>
              <Button variant="ghost" className="w-full justify-start" disabled={plan.id === "free"}>
                Integrações {plan.id === "free" && <Badge variant="secondary" className="ml-auto">Premium</Badge>}
              </Button>
              <Button variant="ghost" className="w-full justify-start">
                Configurações
              </Button>
            </CardContent>
          </Card>

          <Card className="md:col-span-3">
            <CardHeader>
              <CardTitle>Rastreamentos recentes</CardTitle>
              <CardDescription>Seus últimos pedidos monitorados</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum rastreamento ainda. Crie seu primeiro rastreio para começar!
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
