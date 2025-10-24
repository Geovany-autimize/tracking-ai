import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import QuickCustomerForm from './QuickCustomerForm';

interface ShipmentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Customer = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
};

export default function ShipmentForm({ open, onOpenChange }: ShipmentFormProps) {
  const { customer } = useAuth();
  const [trackingCode, setTrackingCode] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [autoTracking, setAutoTracking] = useState(true);
  const [comboOpen, setComboOpen] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [quickFormOpen, setQuickFormOpen] = useState(false);

  useEffect(() => {
    if (open && customer?.id) {
      loadCustomers();
    }
  }, [open, customer?.id]);

  const loadCustomers = async () => {
    if (!customer?.id) return;

    try {
      const { data, error } = await supabase
        .from('shipment_customers')
        .select('id, first_name, last_name, email')
        .eq('customer_id', customer.id)
        .order('first_name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const handleQuickCustomerCreated = (customerId: string) => {
    setSelectedCustomer(customerId);
    setQuickFormOpen(false);
    loadCustomers(); // Reload customer list
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customer?.id) {
      toast({
        title: 'Erro',
        description: 'Usuário não autenticado',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedCustomer) {
      toast({
        title: 'Cliente obrigatório',
        description: 'Selecione ou crie um cliente antes de continuar',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      // Verificar se o tracking code já existe para este cliente
      const { data: existingShipment } = await supabase
        .from('shipments')
        .select('id')
        .eq('customer_id', customer.id)
        .eq('tracking_code', trackingCode)
        .maybeSingle();

      if (existingShipment) {
        toast({
          title: 'Código de rastreio duplicado',
          description: 'Este código de rastreio já existe para você',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      const { error } = await supabase
        .from('shipments')
        .insert({
          customer_id: customer.id,
          shipment_customer_id: selectedCustomer,
          tracking_code: trackingCode,
          auto_tracking: autoTracking,
          status: 'pending',
        });

      if (error) throw error;

      toast({
        title: 'Rastreio adicionado',
        description: `Código ${trackingCode} adicionado com sucesso`,
      });

      // Resetar e fechar
      setTrackingCode('');
      setSelectedCustomer('');
      setCustomerSearch('');
      setAutoTracking(true);
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating shipment:', error);
      toast({
        title: 'Erro ao criar rastreio',
        description: 'Tente novamente',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCustomers = customers.filter((c) =>
    `${c.first_name} ${c.last_name}`.toLowerCase().includes(customerSearch.toLowerCase())
  );

  return (
    <>
      <QuickCustomerForm
        open={quickFormOpen}
        onOpenChange={setQuickFormOpen}
        onCustomerCreated={handleQuickCustomerCreated}
        initialName={customerSearch}
      />
      
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Novo Rastreio</DialogTitle>
          <DialogDescription>
            Adicione um novo código de rastreio e associe a um cliente
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Código de Rastreio */}
          <div className="space-y-2">
            <Label htmlFor="tracking-code">Código de Rastreio *</Label>
            <Input
              id="tracking-code"
              placeholder="Ex: BR123456789BR"
              value={trackingCode}
              onChange={(e) => setTrackingCode(e.target.value)}
              required
            />
          </div>

          {/* Cliente (Combobox estilo Pipedrive) */}
          <div className="space-y-2">
            <Label htmlFor="customer">Cliente *</Label>
            <Popover open={comboOpen} onOpenChange={setComboOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={comboOpen}
                  className="w-full justify-between"
                >
                  {selectedCustomer
                    ? customers.find((c) => c.id === selectedCustomer)
                      ? `${customers.find((c) => c.id === selectedCustomer)?.first_name} ${customers.find((c) => c.id === selectedCustomer)?.last_name}`
                      : 'Selecione ou digite um cliente...'
                    : 'Selecione ou digite um cliente...'}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[460px] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Buscar ou criar cliente..."
                    value={customerSearch}
                    onValueChange={setCustomerSearch}
                  />
                  <CommandList>
                    {filteredCustomers.length === 0 && customerSearch === '' && (
                      <CommandEmpty>Digite para buscar ou criar cliente</CommandEmpty>
                    )}
                    {filteredCustomers.length === 0 && customerSearch !== '' && (
                      <CommandEmpty>
                        <div className="text-center py-2">
                          <p className="text-sm text-muted-foreground mb-2">Cliente não encontrado</p>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => {
                              setComboOpen(false);
                              setQuickFormOpen(true);
                            }}
                          >
                            Criar "{customerSearch}"
                          </Button>
                        </div>
                      </CommandEmpty>
                    )}
                    {filteredCustomers.length > 0 && (
                      <CommandGroup>
                        {filteredCustomers.map((c) => (
                          <CommandItem
                            key={c.id}
                            value={c.id}
                            onSelect={(value) => {
                              setSelectedCustomer(value);
                              setCustomerSearch('');
                              setComboOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                selectedCustomer === c.id ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            {c.first_name} {c.last_name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Rastreamento Automático */}
          <div className="flex items-center justify-between space-x-2 rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="auto-tracking" className="text-base cursor-pointer">
                Rastreamento Automático
              </Label>
              <p className="text-sm text-muted-foreground">
                Atualizar status automaticamente todos os dias
              </p>
            </div>
            <Switch
              id="auto-tracking"
              checked={autoTracking}
              onCheckedChange={setAutoTracking}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="default" disabled={isLoading}>
              {isLoading ? 'Salvando...' : 'Adicionar Rastreio'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
}