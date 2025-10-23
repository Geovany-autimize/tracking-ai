import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/neon-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ShipmentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Mock de clientes (substituir por dados reais da API)
const mockCustomers = [
  { id: '1', name: 'João Silva' },
  { id: '2', name: 'Maria Santos' },
  { id: '3', name: 'Pedro Oliveira' },
];

export default function ShipmentForm({ open, onOpenChange }: ShipmentFormProps) {
  const [trackingCode, setTrackingCode] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [autoTracking, setAutoTracking] = useState(true);
  const [comboOpen, setComboOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // TODO: Implementar lógica de criação de rastreio
    console.log({
      trackingCode,
      customerId: selectedCustomer,
      customerSearch,
      autoTracking,
    });

    // Resetar e fechar
    setTrackingCode('');
    setSelectedCustomer('');
    setCustomerSearch('');
    setAutoTracking(true);
    onOpenChange(false);
  };

  const filteredCustomers = mockCustomers.filter((customer) =>
    customer.name.toLowerCase().includes(customerSearch.toLowerCase())
  );

  return (
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
                  variant="ghost"
                  neon={false}
                  role="combobox"
                  aria-expanded={comboOpen}
                  className="w-full justify-between border border-input bg-background hover:bg-accent h-10"
                >
                  {selectedCustomer
                    ? mockCustomers.find((c) => c.id === selectedCustomer)?.name
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
                            variant="solid"
                            size="sm"
                            onClick={() => {
                              setSelectedCustomer(`new-${customerSearch}`);
                              setComboOpen(false);
                            }}
                          >
                            Criar "{customerSearch}"
                          </Button>
                        </div>
                      </CommandEmpty>
                    )}
                    {filteredCustomers.length > 0 && (
                      <CommandGroup>
                        {filteredCustomers.map((customer) => (
                          <CommandItem
                            key={customer.id}
                            value={customer.id}
                            onSelect={(value) => {
                              setSelectedCustomer(value);
                              setCustomerSearch('');
                              setComboOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                selectedCustomer === customer.id ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            {customer.name}
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
              neon={false}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="solid">
              Adicionar Rastreio
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
