import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Save, Loader2, ExternalLink, RefreshCw, Check, ChevronsUpDown } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import ShipmentTimeline from '@/components/shipments/ShipmentTimeline';

const statusConfig = {
  pending: { label: 'Pendente', variant: 'secondary' as const },
  in_transit: { label: 'Em Trânsito', variant: 'default' as const },
  delivered: { label: 'Entregue', variant: 'default' as const },
  failed: { label: 'Falha', variant: 'destructive' as const },
};

export default function ShipmentDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { customer } = useAuth();
  const queryClient = useQueryClient();

  const [trackingCode, setTrackingCode] = useState('');
  const [status, setStatus] = useState('pending');
  const [autoTracking, setAutoTracking] = useState(true);
  const [isEdited, setIsEdited] = useState(false);
  
  const [changeCustomerDialogOpen, setChangeCustomerDialogOpen] = useState(false);
  const [newSelectedCustomer, setNewSelectedCustomer] = useState<string>('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [comboOpen, setComboOpen] = useState(false);

  // Carregar dados do rastreio
  const { data: shipmentData, isLoading } = useQuery({
    queryKey: ['shipment', id],
    queryFn: async () => {
      if (!customer?.id || !id) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('shipments')
        .select(`
          *,
          shipment_customer:shipment_customers(
            id,
            first_name,
            last_name,
            email,
            phone
          )
        `)
        .eq('id', id)
        .eq('customer_id', customer.id)
        .single();
      
      if (error) throw error;
      
      // Inicializar os campos com os dados carregados
      setTrackingCode(data.tracking_code);
      setStatus(data.status);
      setAutoTracking(data.auto_tracking);
      
      return data;
    },
    enabled: !!customer?.id && !!id,
  });

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
    if (changeCustomerDialogOpen) {
      loadCustomers();
    }
  }, [changeCustomerDialogOpen]);

  // Mutation para atualizar rastreio
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!customer?.id || !id) throw new Error('Not authenticated');

      // Verificar se o tracking code já existe (exceto o próprio registro)
      if (trackingCode !== shipmentData?.tracking_code) {
        const { data: existing } = await supabase
          .from('shipments')
          .select('id')
          .eq('customer_id', customer.id)
          .eq('tracking_code', trackingCode)
          .neq('id', id)
          .maybeSingle();

        if (existing) {
          throw new Error('Este código de rastreio já existe');
        }
      }

      const { error } = await supabase
        .from('shipments')
        .update({
          tracking_code: trackingCode,
          status: status,
          auto_tracking: autoTracking,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Rastreio atualizado',
        description: 'As informações foram salvas com sucesso',
      });
      setIsEdited(false);
      queryClient.invalidateQueries({ queryKey: ['shipment', id] });
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar',
        description: error.message,
        variant: 'destructive',
      });
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
      toast({ title: 'Cliente vinculado atualizado com sucesso' });
      setChangeCustomerDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['shipment', id] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar cliente',
        description: error.message,
        variant: 'destructive',
      });
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

  const statusInfo = statusConfig[shipmentData.status as keyof typeof statusConfig] || statusConfig.pending;
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
            <h1 className="text-3xl font-bold font-mono">
              {shipmentData.tracking_code}
            </h1>
            <p className="text-muted-foreground">
              Detalhes e histórico do rastreio
            </p>
          </div>
        </div>
        {isEdited && (
          <Button onClick={handleSubmit} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar Alterações
              </>
            )}
          </Button>
        )}
      </div>

      {/* Cliente Vinculado */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-center justify-between pt-6">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Cliente Vinculado</p>
            <p className="text-lg font-semibold">{customerName}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setChangeCustomerDialogOpen(true)}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Trocar Cliente
            </Button>
            {shipmentData.shipment_customer && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/dashboard/customers/${shipmentData.shipment_customer.id}`)}
              >
                Ver Cliente
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Informações do Rastreio */}
        <Card>
          <CardHeader>
            <CardTitle>Informações do Rastreio</CardTitle>
            <CardDescription>
              Edite os dados do rastreio
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="trackingCode">Código de Rastreio *</Label>
                <Input
                  id="trackingCode"
                  value={trackingCode}
                  onChange={(e) => {
                    setTrackingCode(e.target.value);
                    handleFieldChange();
                  }}
                  className="font-mono"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status Atual</Label>
                <div className="flex items-center gap-2">
                  <Badge variant={statusInfo.variant}>
                    {statusInfo.label}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    (atualizado automaticamente)
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between space-x-2 rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="autoTracking" className="text-base cursor-pointer">
                    Rastreamento Automático
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Atualizar status automaticamente
                  </p>
                </div>
                <Switch
                  id="autoTracking"
                  checked={autoTracking}
                  onCheckedChange={(checked) => {
                    setAutoTracking(checked);
                    handleFieldChange();
                  }}
                />
              </div>

              <div className="pt-2 space-y-1 text-sm text-muted-foreground">
                <p>
                  Criado em: {format(new Date(shipmentData.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
                {shipmentData.last_update && (
                  <p>
                    Última atualização: {format(new Date(shipmentData.last_update), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Timeline */}
        <ShipmentTimeline />
      </div>

      {/* Dialog Trocar Cliente */}
      <Dialog open={changeCustomerDialogOpen} onOpenChange={setChangeCustomerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Trocar Cliente Vinculado</DialogTitle>
            <DialogDescription>
              Selecione o novo cliente para este rastreio
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <Popover open={comboOpen} onOpenChange={setComboOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between"
                >
                  {newSelectedCustomer
                    ? customers.find(c => c.id === newSelectedCustomer)
                      ? `${customers.find(c => c.id === newSelectedCustomer)?.first_name} ${customers.find(c => c.id === newSelectedCustomer)?.last_name}`
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
                              setNewSelectedCustomer(value);
                              setComboOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                newSelectedCustomer === c.id ? 'opacity-100' : 'opacity-0'
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
            <Button variant="outline" onClick={() => setChangeCustomerDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => changeCustomerMutation.mutate(newSelectedCustomer)}
              disabled={!newSelectedCustomer || changeCustomerMutation.isPending}
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
    </div>
  );
}
