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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState, useEffect } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useTrackingRefresh } from '@/hooks/use-tracking-refresh';
import { useAuth } from '@/contexts/AuthContext';
import { parseTrackingResponse, mapApiStatusToInternal } from '@/lib/tracking-api';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const statusConfig = {
  pending: { 
    label: 'Pendente', 
    variant: 'outline' as const,
    icon: <Clock className="h-4 w-4" />,
    color: 'text-muted-foreground',
  },
  in_transit: { 
    label: 'Em Trânsito', 
    variant: 'secondary' as const,
    icon: <Package className="h-4 w-4" />,
    color: 'text-blue-500',
  },
  out_for_delivery: { 
    label: 'Saiu para Entrega', 
    variant: 'secondary' as const,
    icon: <Truck className="h-4 w-4" />,
    color: 'text-blue-500',
  },
  delivered: { 
    label: 'Entregue', 
    variant: 'default' as const,
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: 'text-green-500',
  },
  exception: { 
    label: 'Exceção', 
    variant: 'destructive' as const,
    icon: <AlertCircle className="h-4 w-4" />,
    color: 'text-destructive',
  },
};

export default function ShipmentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { customer } = useAuth();

  const [status, setStatus] = useState('');
  const [autoTracking, setAutoTracking] = useState(true);
  const [isEdited, setIsEdited] = useState(false);

  // Estado para gerenciar o diálogo de trocar cliente
  const [showChangeCustomerDialog, setShowChangeCustomerDialog] = useState(false);
  const [selectedNewCustomer, setSelectedNewCustomer] = useState('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerPopoverOpen, setCustomerPopoverOpen] = useState(false);

  // Estado para diálogo de confirmação de exclusão
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: shipmentData, isLoading } = useQuery({
    queryKey: ['shipment', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shipments')
        .select(`
          *,
          shipment_customer:shipment_customers(*)
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (shipmentData) {
      setStatus(shipmentData.status || '');
      setAutoTracking(shipmentData.auto_tracking ?? true);
    }
  }, [shipmentData]);

  // Hook para atualizar rastreio
  const { canRefresh, timeUntilNextRefresh, refreshTracking, isRefreshing } = useTrackingRefresh(
    customer?.id,
    {
      onSuccess: async (data) => {
        // Processar dados da API
        const trackingData = parseTrackingResponse(data);
        if (!trackingData) return;

        // Atualizar banco de dados
        const { error } = await supabase
          .from('shipments')
          .update({
            tracker_id: trackingData.tracker.trackerId,
            tracking_events: trackingData.events as any,
            shipment_data: trackingData.shipment as any,
            status: mapApiStatusToInternal(trackingData.shipment.statusMilestone),
            last_update: new Date().toISOString(),
          })
          .eq('id', id);

        if (!error) {
          queryClient.invalidateQueries({ queryKey: ['shipment', id] });
        }
      },
    }
  );

  const loadCustomers = async () => {
    if (!customer?.id) return;
    const { data } = await supabase
      .from('shipment_customers')
      .select('id, first_name, last_name, email')
      .eq('customer_id', customer.id)
      .order('first_name');
    setCustomers(data || []);
  };

  useEffect(() => {
    if (showChangeCustomerDialog) {
      loadCustomers();
    }
  }, [showChangeCustomerDialog]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('shipments')
        .update({
          status,
          auto_tracking: autoTracking,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipment', id] });
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      toast.success('Rastreio atualizado com sucesso!');
      setIsEdited(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao atualizar rastreio');
    },
  });

  // Mutation para excluir rastreio
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('shipments')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Rastreio excluído com sucesso!');
      navigate('/dashboard/shipments');
    },
    onError: (error: Error) => {
      toast.error('Erro ao excluir rastreio');
    },
  });

  const changeCustomerMutation = useMutation({
    mutationFn: async (newCustomerId: string) => {
      const { error } = await supabase
        .from('shipments')
        .update({ shipment_customer_id: newCustomerId })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Cliente vinculado atualizado com sucesso');
      setShowChangeCustomerDialog(false);
      queryClient.invalidateQueries({ queryKey: ['shipment', id] });
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar cliente');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate();
  };

  const handleFieldChange = () => {
    setIsEdited(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!shipmentData) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px]">
        <p className="text-muted-foreground mb-4">Rastreio não encontrado</p>
        <Button onClick={() => navigate('/dashboard/shipments')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Rastreios
        </Button>
      </div>
    );
  }

  const customerName = shipmentData.shipment_customer
    ? `${shipmentData.shipment_customer.first_name} ${shipmentData.shipment_customer.last_name}`
    : 'Não vinculado';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/dashboard/shipments')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold font-mono">{shipmentData.tracking_code}</h1>
            <p className="text-muted-foreground">
              {shipmentData.tracker_id ? `ID: ${shipmentData.tracker_id}` : 'Detalhes do rastreio'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refreshTracking(shipmentData.tracking_code)}
            disabled={!canRefresh || isRefreshing}
            title={!canRefresh ? `Aguarde ${timeUntilNextRefresh}s` : 'Atualizar rastreio'}
          >
            {isRefreshing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <RefreshCw className="h-5 w-5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowDeleteDialog(true)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="space-y-6">
        {/* Informações do Cliente e Rastreio - Layout de Fora a Fora */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cliente Vinculado */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5" />
                Cliente Vinculado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Nome</p>
                  <p className="text-lg font-semibold">{customerName}</p>
                </div>
                
                {shipmentData.shipment_customer && (
                  <>
                    {shipmentData.shipment_customer.email && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Email</p>
                        <p className="text-sm">{shipmentData.shipment_customer.email}</p>
                      </div>
                    )}
                    {shipmentData.shipment_customer.phone && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Telefone</p>
                        <p className="text-sm">{shipmentData.shipment_customer.phone}</p>
                      </div>
                    )}
                  </>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowChangeCustomerDialog(true)}
                    className="flex-1"
                  >
                    <RefreshIcon className="h-4 w-4 mr-2" />
                    Trocar Cliente
                  </Button>
                  {shipmentData.shipment_customer && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/dashboard/customers/${shipmentData.shipment_customer.id}`)}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Informações do Rastreio */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações do Rastreio</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tracking-code">Código de Rastreio</Label>
                  <Input
                    id="tracking-code"
                    value={shipmentData.tracking_code}
                    disabled
                    className="font-mono bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    O código de rastreio não pode ser alterado
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <div>
                    <Badge variant={statusConfig[status as keyof typeof statusConfig]?.variant || 'outline'} className="gap-2">
                      <span className={statusConfig[status as keyof typeof statusConfig]?.color}>
                        {statusConfig[status as keyof typeof statusConfig]?.icon}
                      </span>
                      {statusConfig[status as keyof typeof statusConfig]?.label || status}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="auto-tracking"
                    checked={autoTracking}
                    onCheckedChange={(checked) => { setAutoTracking(checked); handleFieldChange(); }}
                  />
                  <Label htmlFor="auto-tracking">Rastreamento Automático</Label>
                </div>

                <Button
                  type="submit"
                  disabled={!isEdited || updateMutation.isPending}
                  className="w-full"
                >
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar Alterações'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Histórico de Rastreio - Full Width */}
        <ShipmentTimeline 
          events={(shipmentData.tracking_events as any) || []} 
          shipmentData={shipmentData.shipment_data as any}
        />
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
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between"
                >
                  {selectedNewCustomer
                    ? customers.find(c => c.id === selectedNewCustomer)
                      ? `${customers.find(c => c.id === selectedNewCustomer)?.first_name} ${customers.find(c => c.id === selectedNewCustomer)?.last_name}`
                      : 'Selecione um cliente...'
                    : 'Selecione um cliente...'}
                  <ChevronsUpDown className="ml-2 h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Buscar cliente..."
                    value={customerSearch}
                    onValueChange={setCustomerSearch}
                  />
                  <CommandList>
                    <CommandEmpty>Nenhum cliente encontrado</CommandEmpty>
                    <CommandGroup>
                      {customers
                        .filter(c =>
                          `${c.first_name} ${c.last_name}`
                            .toLowerCase()
                            .includes(customerSearch.toLowerCase())
                        )
                        .map(c => (
                          <CommandItem
                            key={c.id}
                            value={c.id}
                            onSelect={(value) => {
                              setSelectedNewCustomer(value);
                              setCustomerPopoverOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                selectedNewCustomer === c.id ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            {c.first_name} {c.last_name}
                          </CommandItem>
                        ))}
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
            <Button
              onClick={() => changeCustomerMutation.mutate(selectedNewCustomer)}
              disabled={!selectedNewCustomer || changeCustomerMutation.isPending}
            >
              {changeCustomerMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Atualizando...
                </>
              ) : (
                'Confirmar'
              )}
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
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Excluir'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
