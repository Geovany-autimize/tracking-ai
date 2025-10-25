import PageHeader from '@/components/app/PageHeader';
import { CurrentPlanCard } from '@/components/billing/CurrentPlanCard';
import { CreditBalanceCard } from '@/components/billing/CreditBalanceCard';
import { CreditPackagesGrid } from '@/components/billing/CreditPackagesGrid';
import { BillingHistoryTable } from '@/components/billing/BillingHistoryTable';
import { useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2 } from 'lucide-react';

export default function BillingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const [showPackages, setShowPackages] = useState(false);

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

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold">Faturamento</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie seu plano, créditos e histórico de pagamentos
        </p>
      </header>

      {/* Cards principais */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CurrentPlanCard />
        <CreditBalanceCard onPurchaseClick={() => setShowPackages(!showPackages)} />
      </div>

      {/* Grid de pacotes */}
      <CreditPackagesGrid />

      {/* Histórico */}
      <BillingHistoryTable />
    </div>
  );
}
