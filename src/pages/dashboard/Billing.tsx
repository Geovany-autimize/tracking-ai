import { CurrentPlanCard } from '@/components/billing/CurrentPlanCard';
import { CreditBalanceCard } from '@/components/billing/CreditBalanceCard';
import { BillingHistoryTable } from '@/components/billing/BillingHistoryTable';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export default function BillingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showAutoRecharge, setShowAutoRecharge] = useState(false);

  useEffect(() => {
    const success = searchParams.get('success');
    if (success === 'true') {
      toast({
        title: 'Pagamento realizado com sucesso!',
        description: 'Seus créditos foram adicionados à sua conta.',
        duration: 5000,
        className: 'bg-success text-white',
      });
      // Remove o parâmetro da URL
      searchParams.delete('success');
      setSearchParams(searchParams);
    }
  }, [searchParams, setSearchParams, toast]);

  const handleAutoRecharge = () => {
    toast({
      title: "Em breve",
      description: "A configuração de Auto Recharge estará disponível em breve.",
    });
  };

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold">Configurações</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie integrações e faturamento
        </p>
      </header>

      <Tabs defaultValue="billing" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger 
            value="integrations" 
            onClick={() => navigate('/dashboard/settings')}
          >
            Integrações
          </TabsTrigger>
          <TabsTrigger value="billing">
            Faturamento
          </TabsTrigger>
        </TabsList>

        <TabsContent value="billing" className="space-y-6">
          {/* Cards principais */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <CurrentPlanCard />
            <CreditBalanceCard 
              onPurchaseClick={() => toast({
                title: "Em breve",
                description: "A compra de créditos estará disponível em breve.",
              })}
              onAutoRechargeClick={handleAutoRecharge}
            />
          </div>

          {/* Histórico */}
          <BillingHistoryTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}
