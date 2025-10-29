import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PhoneField from './PhoneField';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { z } from 'zod';
import { useHighlights } from '@/contexts/HighlightsContext';

interface QuickCustomerFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCustomerCreated?: (customerId: string) => void;
  initialName?: string;
}

const quickCustomerSchema = z.object({
  first_name: z.string()
    .trim()
    .min(1, 'Nome é obrigatório')
    .max(100, 'Nome muito longo'),
  last_name: z.string()
    .trim()
    .min(1, 'Sobrenome é obrigatório')
    .max(100, 'Sobrenome muito longo'),
  phone: z.string()
    .regex(/^\+[1-9]\d{1,14}$/, 'Telefone inválido (formato internacional)'),
  email: z.string()
    .email('Email inválido')
    .optional()
    .or(z.literal('')),
});

export default function QuickCustomerForm({ 
  open, 
  onOpenChange, 
  onCustomerCreated,
  initialName = '' 
}: QuickCustomerFormProps) {
  const { customer } = useAuth();
  const { addNew } = useHighlights();
  
  // Parse initial name into first and last name
  const names = initialName.split(' ');
  const initialFirstName = names[0] || '';
  const initialLastName = names.slice(1).join(' ') || '';

  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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

    // Client-side validation
    try {
      quickCustomerSchema.parse({
        first_name: firstName,
        last_name: lastName,
        phone: phone,
        email: email || undefined,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        toast({
          title: 'Erro de validação',
          description: firstError.message,
          variant: 'destructive',
        });
        return;
      }
    }

    setIsLoading(true);

    try {
      // Generate email if not provided
      const finalEmail = email.trim() 
        ? email.trim().toLowerCase()
        : `${firstName.toLowerCase()}.${lastName.toLowerCase()}@cliente.temp`;

      // Verificar se já existe cliente com o mesmo email
      const { data: existingByEmail } = await supabase
        .from('shipment_customers')
        .select('id')
        .eq('customer_id', customer.id)
        .eq('email', finalEmail)
        .maybeSingle();

      if (existingByEmail) {
        toast({
          title: 'E-mail duplicado',
          description: 'Já existe um cliente com este e-mail',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      // Verificar se já existe cliente com o mesmo telefone
      const { data: existingByPhone } = await supabase
        .from('shipment_customers')
        .select('id')
        .eq('customer_id', customer.id)
        .eq('phone', phone)
        .maybeSingle();

      if (existingByPhone) {
        toast({
          title: 'Telefone duplicado',
          description: 'Já existe um cliente com este telefone',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      const { data: newCustomer, error } = await supabase
        .from('shipment_customers')
        .insert({
          customer_id: customer.id,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: finalEmail,
          phone: phone,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Cliente criado',
        description: `${firstName} ${lastName} foi adicionado com sucesso`,
      });

      // Reset and close
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      onOpenChange(false);
      
      // Notify parent component
      if (onCustomerCreated && newCustomer) {
        onCustomerCreated(newCustomer.id);
      }

      // highlight como novo (efeito temporário na lista)
      if (newCustomer?.id) {
        addNew('customer', newCustomer.id);
      }
    } catch (error) {
      console.error('Error creating customer:', error);
      toast({
        title: 'Erro ao criar cliente',
        description: 'Tente novamente',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Criar Novo Cliente</DialogTitle>
          <DialogDescription>
            Preencha os dados obrigatórios do cliente para continuar
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Nome e Sobrenome */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quick-first-name">Nome *</Label>
              <Input
                id="quick-first-name"
                placeholder="João"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quick-last-name">Sobrenome *</Label>
              <Input
                id="quick-last-name"
                placeholder="Silva"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Telefone (obrigatório) */}
          <PhoneField
            label="Telefone / WhatsApp *"
            required={true}
            value={phone}
            onChange={setPhone}
            helperText="Número para contato e notificações"
          />

          {/* E-mail (opcional) */}
          <div className="space-y-2">
            <Label htmlFor="quick-email">E-mail (opcional)</Label>
            <Input
              id="quick-email"
              type="email"
              placeholder="joao@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Se não informado, será gerado automaticamente
            </p>
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
              {isLoading ? 'Criando...' : 'Criar Cliente'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
