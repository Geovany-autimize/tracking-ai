import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Zap, AlertCircle, Loader2, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { usePlanRestrictions } from "@/hooks/use-plan-restrictions";
import { PremiumFeatureBadge } from "@/components/ui/premium-feature-badge";

interface BuyCreditsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BuyCreditsDialog({ open, onOpenChange }: BuyCreditsDialogProps) {
  const { subscription } = useAuth();
  const { canBuyExtraCredits } = usePlanRestrictions();
  const [credits, setCredits] = useState(500);
  const [isProcessing, setIsProcessing] = useState(false);

  // Calcula preço com desconto progressivo
  const getPricePerCredit = (quantity: number): number => {
    if (quantity >= 2500) return 0.20;
    if (quantity >= 1000) return 0.22;
    if (quantity >= 500) return 0.25;
    if (quantity >= 100) return 0.30;
    return 0.35;
  };

  const pricePerCredit = getPricePerCredit(credits);
  const totalPrice = credits * pricePerCredit;
  const basePricePerCredit = 0.35;
  const savings = credits >= 100 
    ? Math.round((1 - pricePerCredit / basePricePerCredit) * 100) 
    : 0;

  const handleCreditsChange = (value: string) => {
    const numValue = parseInt(value) || 0;
    setCredits(Math.max(10, Math.min(5000, numValue)));
  };

  const handlePurchase = async () => {
    if (credits < 10 || credits > 5000) {
      toast.error("Quantidade inválida", {
        description: "Escolha entre 10 e 5000 créditos"
      });
      return;
    }

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-credits-checkout", {
        body: { creditsAmount: credits },
      });

      if (error) throw error;
      if (!data?.url) throw new Error("No checkout URL returned");

      window.open(data.url, "_blank");
      toast.info("Redirecionando para o checkout...", {
        description: "Complete o pagamento na nova aba"
      });
    } catch (error) {
      console.error("Error creating checkout:", error);
      toast.error("Erro ao processar pagamento", {
        description: error instanceof Error ? error.message : "Tente novamente"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const expirationDate = subscription?.current_period_end 
    ? new Date(subscription.current_period_end).toLocaleDateString("pt-BR", {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      })
    : "final do período atual";

  // Determina qual tier de desconto está ativo
  const getDiscountTier = () => {
    if (credits >= 2500) return { label: "2500+", discount: 43 };
    if (credits >= 1000) return { label: "1000-2499", discount: 37 };
    if (credits >= 500) return { label: "500-999", discount: 29 };
    if (credits >= 100) return { label: "100-499", discount: 14 };
    return null;
  };

  const discountTier = getDiscountTier();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Zap className="w-6 h-6 text-primary" />
            Comprar Créditos Extras
          </DialogTitle>
          <DialogDescription>
            {canBuyExtraCredits 
              ? 'Escolha a quantidade exata de créditos que você precisa'
              : 'Recurso disponível apenas no plano Premium'
            }
          </DialogDescription>
        </DialogHeader>

        {!canBuyExtraCredits ? (
          <div className="py-4">
            <PremiumFeatureBadge
              title="Créditos Extras - Premium"
              description="O plano Free inclui 5 créditos mensais. Para comprar créditos adicionais e escalar suas operações, faça upgrade para o plano Premium."
              feature="extra_credits"
            />
          </div>
        ) : (
          <div className="space-y-6 py-4">
          {/* Input de quantidade */}
          <div className="space-y-3">
            <Label htmlFor="credits" className="text-base">
              Quantidade de créditos
            </Label>
            <Input
              id="credits"
              type="number"
              min={10}
              max={5000}
              value={credits}
              onChange={(e) => handleCreditsChange(e.target.value)}
              className="text-center text-3xl font-bold h-16"
            />
            <p className="text-xs text-muted-foreground text-center">
              Mínimo: 10 créditos • Máximo: 5.000 créditos
            </p>
          </div>

          {/* Slider */}
          <div className="space-y-3">
            <Slider
              value={[credits]}
              onValueChange={([value]) => setCredits(value)}
              min={10}
              max={5000}
              step={10}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground px-1">
              <span>10</span>
              <span>1.000</span>
              <span>2.500</span>
              <span>5.000</span>
            </div>
          </div>

          {/* Tabela de descontos */}
          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <p className="text-sm font-medium mb-3 flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-green-600" />
                Descontos progressivos
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className={`p-2 rounded ${credits >= 100 && credits < 500 ? 'bg-primary/10 border border-primary' : 'bg-background'}`}>
                  <div className="font-medium">100-499 créditos</div>
                  <div className="text-muted-foreground">R$ 0,30/crédito (14% OFF)</div>
                </div>
                <div className={`p-2 rounded ${credits >= 500 && credits < 1000 ? 'bg-primary/10 border border-primary' : 'bg-background'}`}>
                  <div className="font-medium">500-999 créditos</div>
                  <div className="text-muted-foreground">R$ 0,25/crédito (29% OFF)</div>
                </div>
                <div className={`p-2 rounded ${credits >= 1000 && credits < 2500 ? 'bg-primary/10 border border-primary' : 'bg-background'}`}>
                  <div className="font-medium">1.000-2.499 créditos</div>
                  <div className="text-muted-foreground">R$ 0,22/crédito (37% OFF)</div>
                </div>
                <div className={`p-2 rounded ${credits >= 2500 ? 'bg-primary/10 border border-primary' : 'bg-background'}`}>
                  <div className="font-medium">2.500+ créditos</div>
                  <div className="text-muted-foreground">R$ 0,20/crédito (43% OFF)</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Breakdown de preço */}
          <Card className="border-2 border-primary/20">
            <CardContent className="p-6 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Quantidade:</span>
                <span className="font-semibold">{credits.toLocaleString('pt-BR')} créditos</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Preço por crédito:</span>
                <span className="font-semibold">R$ {pricePerCredit.toFixed(2)}</span>
              </div>
              
              {discountTier && (
                <div className="flex justify-between text-sm">
                  <span className="text-green-600">Desconto aplicado:</span>
                  <span className="font-semibold text-green-600">{discountTier.discount}% OFF</span>
                </div>
              )}
              
              <Separator />
              
              <div className="flex justify-between text-xl font-bold">
                <span>Total:</span>
                <span className="text-primary">R$ {totalPrice.toFixed(2)}</span>
              </div>

              {savings > 0 && (
                <p className="text-xs text-center text-green-600 font-medium">
                  Você economiza R$ {((basePricePerCredit - pricePerCredit) * credits).toFixed(2)} comprando agora!
                </p>
              )}
            </CardContent>
          </Card>

          {/* Aviso de expiração */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Importante:</strong> Os créditos extras expiram em <strong>{expirationDate}</strong>, 
              junto com seus créditos mensais. Compre apenas o necessário para o período atual.
            </AlertDescription>
          </Alert>

          {/* Botão de compra */}
          <Button 
            className="w-full h-12 text-lg"
            size="lg"
            onClick={handlePurchase}
            disabled={isProcessing || credits < 10 || credits > 5000}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Zap className="w-5 h-5 mr-2" />
                Comprar {credits.toLocaleString('pt-BR')} créditos por R$ {totalPrice.toFixed(2)}
              </>
            )}
          </Button>

            <p className="text-xs text-center text-muted-foreground">
              Pagamento seguro processado pelo Stripe
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
