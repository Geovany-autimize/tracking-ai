import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function CreditsSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isConfirming, setIsConfirming] = useState(true);
  const [purchaseData, setPurchaseData] = useState<any>(null);
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    const confirmPurchase = async () => {
      if (!sessionId) {
        toast.error("ID de sessão não encontrado");
        navigate("/dashboard/billing");
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke("confirm-credits-purchase", {
          body: { sessionId },
        });

        if (error) throw error;
        
        setPurchaseData(data.purchase);
        toast.success("Créditos adicionados com sucesso!", {
          description: `${data.purchase.credits_amount} créditos estão disponíveis agora`
        });
      } catch (error) {
        console.error("Error confirming purchase:", error);
        toast.error("Erro ao confirmar compra", {
          description: "Entre em contato com o suporte"
        });
      } finally {
        setIsConfirming(false);
      }
    };

    confirmPurchase();
  }, [sessionId, navigate]);

  if (isConfirming) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <Loader2 className="w-16 h-16 mx-auto animate-spin text-primary" />
            <div>
              <p className="text-xl font-semibold">Confirmando sua compra...</p>
              <p className="text-sm text-muted-foreground mt-2">
                Aguarde enquanto processamos seu pagamento
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="rounded-full bg-green-100 p-3">
              <CheckCircle2 className="w-16 h-16 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-center text-2xl">
            Compra Confirmada! 🎉
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {purchaseData && (
            <div className="bg-muted/50 p-4 rounded-lg text-center space-y-2">
              <div className="flex items-center justify-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                <span className="text-3xl font-bold text-primary">
                  {purchaseData.credits_amount.toLocaleString('pt-BR')}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                créditos adicionados à sua conta
              </p>
            </div>
          )}
          
          <div className="space-y-3">
            <p className="text-center text-muted-foreground">
              Seus créditos extras foram adicionados e já estão disponíveis para uso. 
              Aproveite para rastrear mais pedidos!
            </p>
          </div>
          
          <div className="space-y-2">
            <Button 
              className="w-full"
              size="lg"
              onClick={() => navigate("/dashboard/billing")}
            >
              Ver Meus Créditos
            </Button>
            <Button 
              variant="outline"
              className="w-full"
              onClick={() => navigate("/dashboard")}
            >
              Voltar ao Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
