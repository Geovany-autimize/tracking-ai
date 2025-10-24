import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import PhoneField from './PhoneField';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface CustomerFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CustomerForm({ open, onOpenChange }: CustomerFormProps) {
  const { customer } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
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

    if (!phone) {
      toast({
        title: 'Erro',
        description: 'Telefone/WhatsApp é obrigatório',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const normalizedEmail = email.toLowerCase().trim();

      // Verificar se já existe cliente com o mesmo email
      const { data: existingByEmail } = await supabase
        .from('shipment_customers')
        .select('id')
        .eq('customer_id', customer.id)
        .eq('email', normalizedEmail)
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

      // Verificar se já existe cliente com o mesmo telefone (se fornecido)
      if (phone) {
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
      }

      const { error } = await supabase
        .from('shipment_customers')
        .insert({
          customer_id: customer.id,
          first_name: firstName,
          last_name: lastName,
          email: normalizedEmail,
          phone: phone || null,
          notes: notes || null,
        });

      if (error) throw error;

      toast({
        title: 'Cliente adicionado',
        description: `${firstName} ${lastName} foi adicionado com sucesso`,
      });

      // Resetar e fechar
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      setNotes('');
      onOpenChange(false);
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
          <DialogTitle>Novo Cliente</DialogTitle>
          <DialogDescription>
            Adicione as informações do cliente para começar a rastrear encomendas
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Nome e Sobrenome */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first-name">Nome *</Label>
              <Input
                id="first-name"
                placeholder="João"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last-name">Sobrenome *</Label>
              <Input
                id="last-name"
                placeholder="Silva"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>

          {/* E-mail */}
          <div className="space-y-2">
            <Label htmlFor="email">E-mail *</Label>
            <Input
              id="email"
              type="email"
              placeholder="joao@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* Telefone (usando PhoneField existente) */}
          <PhoneField
            label="Telefone / WhatsApp *"
            required={true}
            value={phone}
            onChange={setPhone}
            helperText="Número para contato e notificações"
          />

          {/* Observação */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observação</Label>
            <Textarea
              id="notes"
              placeholder="Informações adicionais sobre o cliente..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
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
              {isLoading ? 'Salvando...' : 'Adicionar Cliente'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
