import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Upload, RefreshCw } from 'lucide-react';
import ShipmentForm from '@/components/forms/ShipmentForm';
import ShipmentList from '@/components/shipments/ShipmentList';
import { ImportDialog } from '@/components/dialogs/ImportDialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { getAvailableCredits } from '@/lib/credits';

export default function ShipmentsPage() {
  const { customer, refreshSession } = useAuth();
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleFormClose = (open: boolean) => {
    setFormOpen(open);
    if (!open) setRefreshTrigger(prev => prev + 1);
  };

  const handleRefreshAll = async () => {
    if (!customer?.id) return;
    
    setIsRefreshing(true);
    toast({
      title: "Atualizando rastreamentos",
      description: "Buscando atualizações para todos os rastreamentos ativos...",
    });

    try {
      const { data, error } = await supabase.functions.invoke('refresh-active-trackings');
      
      if (error) throw error;

      toast({
        title: "Rastreamentos atualizados",
        description: `${data?.updated || 0} rastreamentos foram atualizados com sucesso`,
      });

      // Forçar recarregamento da lista
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Error refreshing trackings:', error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar os rastreamentos. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleImport = async (data: any[]) => {
    if (!customer?.id) {
      toast({
        title: 'Erro',
        description: 'Usuário não autenticado',
        variant: 'destructive',
      });
      return;
    }

    const creditsNeeded = data.length;
    const availableCredits = await getAvailableCredits(customer.id);

    // Validar créditos disponíveis antes de começar
    if (availableCredits < creditsNeeded) {
      toast({
        title: 'Créditos insuficientes',
        description: `Você precisa de ${creditsNeeded} créditos para importar ${data.length} rastreios. Disponível: ${availableCredits}`,
        variant: 'destructive',
      });
      return;
    }

    // Função auxiliar para buscar ou criar shipment_customer
    const getOrCreateShipmentCustomer = async (email: string): Promise<string | null> => {
      if (!email || !customer?.id) return null;
      
      const { data: existingCustomer } = await supabase
        .from('shipment_customers')
        .select('id')
        .eq('email', email)
        .eq('customer_id', customer.id)
        .maybeSingle();
      
      return existingCustomer?.id || null;
    };

    let successCount = 0;
    let failedCount = 0;
    let creditsExhausted = false;

    // Processar cada item da importação
    for (const item of data) {
      // Verificar se ainda há créditos disponíveis antes de cada item
      if (creditsExhausted) {
        failedCount++;
        continue;
      }

      try {
        // Usar nova função que cria shipment e consome crédito atomicamente
        const { data: result, error } = await supabase.functions.invoke('create-shipment-with-credit', {
          body: {
            tracking_code: item.tracking_code,
            shipment_customer_id: item.customer_email ? await getOrCreateShipmentCustomer(item.customer_email) : null,
            auto_tracking: item.auto_tracking !== undefined ? item.auto_tracking : true,
          },
        });

        if (error) throw error;

        if (!result.success) {
          // Tratar erros específicos
          if (result.error === 'DUPLICATE_TRACKING_CODE') {
            failedCount++;
            continue; // Duplicata, não é erro crítico
          } else if (result.error === 'NO_CREDITS') {
            creditsExhausted = true;
            failedCount++;
            toast({
              title: 'Créditos esgotados',
              description: `Importação parcial: ${successCount} rastreios criados. ${data.length - successCount} não foram importados por falta de créditos.`,
              variant: 'destructive',
            });
            continue;
          } else {
            throw new Error(result.error || result.message || 'Erro ao criar rastreio');
          }
        }

        // Shipment criado com sucesso
        successCount++;
      } catch (error) {
        failedCount++;
        console.error('Error processing import item:', error);
      }
    }

    // Atualizar créditos na UI
    await refreshSession();

    // Feedback final
    if (successCount === data.length) {
      toast({
        title: 'Importação concluída',
        description: `${successCount} rastreios importados com sucesso`,
      });
    } else if (successCount > 0) {
      toast({
        title: 'Importação parcial',
        description: `${successCount} rastreios importados, ${failedCount} falharam`,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Importação falhou',
        description: 'Nenhum rastreio foi importado',
        variant: 'destructive',
      });
    }

    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h2 className="text-2xl font-semibold">Rastreios</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie todos os seus rastreios de encomendas
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="gap-2 shrink-0" 
            onClick={handleRefreshAll}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Atualizar Todos
          </Button>
          <Button variant="outline" className="gap-2 shrink-0" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" />
            Importar
          </Button>
          <Button variant="default" className="gap-2 shrink-0" onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" />
            Novo Rastreio
          </Button>
        </div>
      </div>

      <ShipmentForm open={formOpen} onOpenChange={handleFormClose} />
      <ImportDialog type="shipments" open={importOpen} onOpenChange={setImportOpen} onImport={handleImport} />

      <ShipmentList refreshTrigger={refreshTrigger} />
    </div>
  );
}
