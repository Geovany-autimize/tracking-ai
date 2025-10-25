import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { ArrowLeft, User, Loader2, Trash2, RefreshCw, ExternalLink, RefreshCw as RefreshIcon, Package, Truck, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ShipmentTimeline } from '@/components/shipments/ShipmentTimeline';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTrackingRefresh } from '@/hooks/use-tracking-refresh';
import { useAuth } from '@/contexts/AuthContext';
import { parseTrackingResponse, mapApiStatusToInternal } from '@/lib/tracking-api';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
const statusConfig = {
  pending: {
    label: 'Pendente',
    icon: <Clock className="h-4 w-4" />,
    badgeClass: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30 hover:bg-yellow-500/20'
  },
  in_transit: {
    label: 'Em Trânsito',
    icon: <Package className="h-4 w-4" />,
    badgeClass: 'bg-[hsl(199,89%,48%)]/10 text-[hsl(199,89%,48%)] border-[hsl(199,89%,48%)]/30 hover:bg-[hsl(199,89%,48%)]/20'
  },
  out_for_delivery: {
    label: 'Saiu para Entrega',
    icon: <Truck className="h-4 w-4" />,
    badgeClass: 'bg-[hsl(262,52%,58%)]/10 text-[hsl(262,52%,58%)] border-[hsl(262,52%,58%)]/30 hover:bg-[hsl(262,52%,58%)]/20'
  },
  delivered: {
    label: 'Entregue',
    icon: <CheckCircle2 className="h-4 w-4" />,
    badgeClass: 'bg-green-500/10 text-green-500 border-green-500/30 hover:bg-green-500/20'
  },
  exception: {
    label: 'Exceção',
    icon: <AlertCircle className="h-4 w-4" />,
    badgeClass: 'bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/20'
  }
};
export default function ShipmentDetails() {
  const {
    id
  } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    customer
  } = useAuth();
  const [autoTracking, setAutoTracking] = useState(true);

  // Estado para gerenciar o diálogo de trocar cliente
  const [showChangeCustomerDialog, setShowChangeCustomerDialog] = useState(false);
  const [selectedNewCustomer, setSelectedNewCustomer] = useState('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerPopoverOpen, setCustomerPopoverOpen] = useState(false);

  // Estado para diálogo de confirmação de exclusão
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const {
    data: shipmentData,
    isLoading
  } = useQuery({
    queryKey: ['shipment', id],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from('shipments').select(`
          *,
          shipment_customer:shipment_customers(*)
        `).eq('id', id).maybeSingle();
      if (error) throw error;
      return data;
    }
  });
  useEffect(() => {
    if (shipmentData) {
      setAutoTracking(shipmentData.auto_tracking ?? true);
    }
  }, [shipmentData]);

  // Hook para atualizar rastreio
  const {
    canRefresh,
    timeUntilNextRefresh,
    refreshTracking,
    isRefreshing
  } = useTrackingRefresh(customer?.id, {
    onSuccess: async data => {
      console.log('[ShipmentDetails] Received tracking data:', data);
      
      // Processar dados da API - a resposta vem dentro de um array
      const apiData = Array.isArray(data) ? data[0] : data;
      const trackingData = parseTrackingResponse(apiData);
      
      if (!trackingData) {
        console.error('[ShipmentDetails] Failed to parse tracking data');
        toast.error('Erro ao processar dados do rastreio');
        return;
      }

      console.log('[ShipmentDetails] Parsed tracking data:', trackingData);

      // Importar função de enriquecimento
      const { enrichEventsWithCourierNames } = await import('@/lib/tracking-api');
      
      // Enriquecer eventos com nomes das transportadoras
      const enrichedEvents = await enrichEventsWithCourierNames(trackingData.events);

      // Atualizar banco de dados
      const {
        error
      } = await supabase.from('shipments').update({
        tracker_id: trackingData.tracker.trackerId,
        tracking_events: enrichedEvents as any,
        shipment_data: trackingData.shipment as any,
        status: mapApiStatusToInternal(trackingData.shipment.statusMilestone),
        last_update: new Date().toISOString()
      }).eq('id', id);
      
      if (error) {
        console.error('[ShipmentDetails] Database update error:', error);
        toast.error('Erro ao salvar dados do rastreio');
      } else {
        console.log('[ShipmentDetails] Database updated successfully');
        toast.success('Rastreio atualizado com sucesso!');
        queryClient.invalidateQueries({
          queryKey: ['shipment', id]
        });
      }
    }
  });
  const loadCustomers = async () => {
    if (!customer?.id) return;
    const {
      data
    } = await supabase.from('shipment_customers').select('id, first_name, last_name, email').eq('customer_id', customer.id).order('first_name');
    setCustomers(data || []);
  };
  useEffect(() => {
    if (showChangeCustomerDialog) {
      loadCustomers();
    }
  }, [showChangeCustomerDialog]);
  // Mutation para atualizar auto_tracking
  const updateAutoTrackingMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const {
        error
      } = await supabase.from('shipments').update({
        auto_tracking: enabled,
        updated_at: new Date().toISOString()
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['shipment', id]
      });
      toast.success('Configuração atualizada!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar configuração');
    }
  });

  // Mutation para excluir rastreio
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const {
        error
      } = await supabase.from('shipments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Rastreio excluído com sucesso!');
      navigate('/dashboard/shipments');
    },
    onError: (error: Error) => {
      toast.error('Erro ao excluir rastreio');
    }
  });
  const changeCustomerMutation = useMutation({
    mutationFn: async (newCustomerId: string) => {
      const {
        error
      } = await supabase.from('shipments').update({
        shipment_customer_id: newCustomerId
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Cliente vinculado atualizado com sucesso');
      setShowChangeCustomerDialog(false);
      queryClient.invalidateQueries({
        queryKey: ['shipment', id]
      });
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar cliente');
    }
  });
  const handleAutoTrackingChange = (checked: boolean) => {
    setAutoTracking(checked);
    updateAutoTrackingMutation.mutate(checked);
  };
  if (isLoading) {
    return <div className="space-y-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>;
  }
  if (!shipmentData) {
    return <div className="flex flex-col items-center justify-center h-[400px]">
        <p className="text-muted-foreground mb-4">Rastreio não encontrado</p>
        <Button onClick={() => navigate('/dashboard/shipments')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Rastreios
        </Button>
      </div>;
  }
  const customerName = shipmentData.shipment_customer ? `${shipmentData.shipment_customer.first_name} ${shipmentData.shipment_customer.last_name}` : 'Não vinculado';
  return <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/shipments')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold font-mono">{shipmentData.tracking_code}</h1>
            <p className="text-muted-foreground">Detalhes do rastreio</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => refreshTracking(shipmentData.tracking_code, shipmentData.tracker_id || undefined)} disabled={!canRefresh || isRefreshing} title={!canRefresh ? `Aguarde ${timeUntilNextRefresh}s` : 'Atualizar rastreio'}>
            {isRefreshing ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setShowDeleteDialog(true)} className="text-destructive hover:text-destructive">
            <Trash2 className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="space-y-6">
        {/* Informações do Rastreio - Full Width */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informações do Rastreio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col lg:flex-row lg:items-center gap-6">
              {/* Status Badge - Destaque Principal */}
              <div className="flex-shrink-0 lg:w-[240px]">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Status Atual</Label>
                  <div className="flex items-center h-[28px]">
                    <Badge className={cn("gap-2 px-3 py-1.5 text-sm", statusConfig[shipmentData.status as keyof typeof statusConfig]?.badgeClass || '')}>
                      <span className="flex-shrink-0">
                        {statusConfig[shipmentData.status as keyof typeof statusConfig]?.icon}
                      </span>
                      <span className="font-semibold">
                        {statusConfig[shipmentData.status as keyof typeof statusConfig]?.label || shipmentData.status}
                      </span>
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Informações do Código - Layout Horizontal */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 lg:pl-6">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Código de Rastreio</Label>
                  <p className="font-mono font-semibold text-lg">{shipmentData.tracking_code}</p>
                </div>

                {shipmentData.tracker_id && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Tracker ID</Label>
                    <p className="font-mono text-sm text-muted-foreground">{shipmentData.tracker_id}</p>
                  </div>
                )}
              </div>

              {/* Rastreamento Automático */}
              <div className="flex-shrink-0 border-l pl-6">
                <div className="flex flex-col items-center gap-2">
                  <Label htmlFor="auto-tracking" className="text-xs text-muted-foreground whitespace-nowrap">
                    Auto Tracking
                  </Label>
                  <Switch 
                    id="auto-tracking" 
                    checked={autoTracking} 
                    onCheckedChange={handleAutoTrackingChange}
                    disabled={updateAutoTrackingMutation.isPending}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cliente Vinculado - Full Width */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5" />
              Cliente Vinculado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col lg:flex-row lg:items-center gap-6">
              {/* Avatar Placeholder */}
              <div className="flex-shrink-0">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-8 w-8 text-muted-foreground" />
                </div>
              </div>

              {/* Informações do Cliente - Grid Compacto */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Nome</Label>
                  <p className="font-semibold">{customerName}</p>
                </div>
                
                {shipmentData.shipment_customer?.email && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Email</Label>
                    <p className="text-sm">{shipmentData.shipment_customer.email}</p>
                  </div>
                )}

                {shipmentData.shipment_customer?.phone && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Telefone</Label>
                    <p className="text-sm">{shipmentData.shipment_customer.phone}</p>
                  </div>
                )}
              </div>

              {/* Ações - Botões com Hierarquia */}
              <div className="flex-shrink-0 flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowChangeCustomerDialog(true)}>
                  Trocar Cliente
                </Button>
                {shipmentData.shipment_customer && (
                  <Button variant="default" size="sm" onClick={() => navigate(`/dashboard/customers/${shipmentData.shipment_customer.id}`)}>
                    Ver Perfil
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Histórico de Rastreio - Full Width */}
        <ShipmentTimeline events={shipmentData.tracking_events as any || []} shipmentData={shipmentData.shipment_data as any} />
      </div>

      {/* Diálogo Trocar Cliente */}
      <Dialog open={showChangeCustomerDialog} onOpenChange={setShowChangeCustomerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Trocar Cliente Vinculado</DialogTitle>
            <DialogDescription>
              Selecione o novo cliente para este rastreio
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <Popover open={customerPopoverOpen} onOpenChange={setCustomerPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between">
                  {selectedNewCustomer ? customers.find(c => c.id === selectedNewCustomer) ? `${customers.find(c => c.id === selectedNewCustomer)?.first_name} ${customers.find(c => c.id === selectedNewCustomer)?.last_name}` : 'Selecione um cliente...' : 'Selecione um cliente...'}
                  <ChevronsUpDown className="ml-2 h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command shouldFilter={false}>
                  <CommandInput placeholder="Buscar cliente..." value={customerSearch} onValueChange={setCustomerSearch} />
                  <CommandList>
                    <CommandEmpty>Nenhum cliente encontrado</CommandEmpty>
                    <CommandGroup>
                      {customers.filter(c => `${c.first_name} ${c.last_name}`.toLowerCase().includes(customerSearch.toLowerCase())).map(c => <CommandItem key={c.id} value={c.id} onSelect={value => {
                      setSelectedNewCustomer(value);
                      setCustomerPopoverOpen(false);
                    }}>
                            <Check className={cn('mr-2 h-4 w-4', selectedNewCustomer === c.id ? 'opacity-100' : 'opacity-0')} />
                            {c.first_name} {c.last_name}
                          </CommandItem>)}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChangeCustomerDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={() => changeCustomerMutation.mutate(selectedNewCustomer)} disabled={!selectedNewCustomer || changeCustomerMutation.isPending}>
              {changeCustomerMutation.isPending ? <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Atualizando...
                </> : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Confirmação de Exclusão */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este rastreio? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteMutation.isPending ? <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </> : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>;
}