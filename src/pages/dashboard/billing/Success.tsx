import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function BillingSuccess() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redireciona automaticamente após 5 segundos
    const timer = setTimeout(() => {
      navigate("/dashboard/billing");
    }, 5000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="container max-w-2xl mx-auto px-4 py-16">
      <Card className="text-center">
        <CardContent className="pt-12 pb-8 space-y-6">
          <div className="flex justify-center">
            <div className="rounded-full bg-primary/10 p-4">
              <CheckCircle2 className="w-16 h-16 text-primary" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Assinatura Realizada com Sucesso!</h1>
            <p className="text-muted-foreground text-lg">
              Parabéns! Sua assinatura foi ativada e você já pode aproveitar todos os benefícios.
            </p>
          </div>

          <div className="bg-muted/50 rounded-lg p-6 space-y-3">
            <h2 className="font-semibold text-lg">Próximos Passos:</h2>
            <ul className="text-left space-y-2 text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">✓</span>
                <span>Acesse seu painel de cobrança para gerenciar sua assinatura</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">✓</span>
                <span>Configure suas integrações e notificações</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">✓</span>
                <span>Comece a rastrear envios ilimitados</span>
              </li>
            </ul>
          </div>

          <div className="pt-4 space-y-3">
            <Button 
              onClick={() => navigate("/dashboard/billing")}
              size="lg"
              className="w-full sm:w-auto"
            >
              Ir para Cobrança
            </Button>
            <p className="text-sm text-muted-foreground">
              Você será redirecionado automaticamente em alguns segundos...
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
