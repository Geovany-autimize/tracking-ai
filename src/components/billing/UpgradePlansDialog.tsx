import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface UpgradePlansDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UpgradePlansDialog({ open, onOpenChange }: UpgradePlansDialogProps) {
  const { plan } = useAuth();
  
  const plans = [
    {
      id: 'free',
      name: 'Gratuito',
      price: 'R$ 0',
      description: 'Perfeito para começar',
      features: [
        '100 créditos mensais',
        'Rastreamento básico',
        'Suporte por email',
        'Acesso ao dashboard',
      ],
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 'R$ 97',
      popular: true,
      description: 'Para negócios em crescimento',
      features: [
        '1.000 créditos mensais',
        'Rastreamento avançado',
        'Suporte prioritário',
        'Relatórios detalhados',
        'API de integração',
        'Templates personalizados',
      ],
    },
  ];

  const isCurrentPlan = (planId: string) => plan?.id === planId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Escolha seu plano
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid md:grid-cols-2 gap-6 py-6">
          {plans.map((planItem) => (
            <Card 
              key={planItem.id}
              className={`relative ${planItem.popular ? 'border-primary shadow-lg' : ''} ${isCurrentPlan(planItem.id) ? 'bg-muted/50' : ''}`}
            >
              {planItem.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                  Mais Popular
                </Badge>
              )}
              
              <CardHeader>
                <CardTitle className="text-xl">{planItem.name}</CardTitle>
                <CardDescription>{planItem.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{planItem.price}</span>
                  <span className="text-muted-foreground">/mês</span>
                </div>
              </CardHeader>
              
              <CardContent>
                <ul className="space-y-3">
                  {planItem.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              
              <CardFooter>
                {isCurrentPlan(planItem.id) ? (
                  <Button 
                    className="w-full" 
                    variant="outline"
                    disabled
                  >
                    Plano Atual
                  </Button>
                ) : (
                  <Button 
                    className="w-full bg-primary hover:bg-primary/90"
                    onClick={() => {
                      // Implementar lógica de upgrade
                      onOpenChange(false);
                    }}
                  >
                    Assinar {planItem.name}
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
