import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import PhoneField from '@/components/forms/PhoneField';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusConfig = {
  pending: { label: 'Pendente', variant: 'secondary' as const },
  in_transit: { label: 'Em Trânsito', variant: 'default' as const },
  delivered: { label: 'Entregue', variant: 'default' as const },
  failed: { label: 'Falha', variant: 'destructive' as const },
};

export default function CustomerDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { customer } = useAuth();
  const queryClient = useQueryClient();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [isEdited, setIsEdited] = useState(false);

  // Carregar dados do cliente
  const { data: customerData, isLoading: isLoadingCustomer } = useQuery({
    queryKey: ['shipment_customer', id],
    queryFn: async () => {
      if (!customer?.id || !id) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('shipment_customers')
        .select('*')
        .eq('id', id)
        .eq('customer_id', customer.id)
        .single();
      
      if (error) throw error;
      
      // Inicializar os campos com os dados carregados
      setFirstName(data.first_name);
      setLastName(data.last_name);
      setEmail(data.email);
      setPhone(data.phone || '');
      setNotes(data.notes || '');
      
      return data;
    },
    enabled: !!customer?.id && !!id,
  });

  // Carregar rastreios do cliente
  const { data: shipments, isLoading: isLoadingShipments } = useQuery({
    queryKey: ['customer_shipments', id],
    queryFn: async () => {
      if (!customer?.id || !id) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('shipments')
        .select('*')
        .eq('customer_id', customer.id)
        .eq('shipment_customer_id', id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!customer?.id && !!id,
  });

  // Mutation para atualizar cliente
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!customer?.id || !id) throw new Error('Not authenticated');

      const normalizedEmail = email.toLowerCase().trim();

      // Verificar duplicatas de email (exceto o próprio registro)
      const { data: existingByEmail } = await supabase
        .from('shipment_customers')
        .select('id')
        .eq('customer_id', customer.id)
        .eq('email', normalizedEmail)
        .neq('id', id)
        .maybeSingle();

      if (existingByEmail) {
        throw new Error('Já existe outro cliente com este e-mail');
      }

      // Verificar duplicatas de telefone (se fornecido)
      if (phone) {
        const { data: existingByPhone } = await supabase
          .from('shipment_customers')
          .select('id')
          .eq('customer_id', customer.id)
          .eq('phone', phone)
          .neq('id', id)
          .maybeSingle();

        if (existingByPhone) {
          throw new Error('Já existe outro cliente com este telefone');
        }
      }

      const { error } = await supabase
        .from('shipment_customers')
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: normalizedEmail,
          phone: phone || null,
          notes: notes || null,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Cliente atualizado',
        description: 'As informações foram salvas com sucesso',
      });
      setIsEdited(false);
      queryClient.invalidateQueries({ queryKey: ['shipment_customer', id] });
      queryClient.invalidateQueries({ queryKey: ['shipment_customers'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar',
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

  if (isLoadingCustomer) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!customerData) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px]">
        <p className="text-muted-foreground mb-4">Cliente não encontrado</p>
        <Button onClick={() => navigate('/dashboard/customers')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Clientes
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/dashboard/customers')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {customerData.first_name} {customerData.last_name}
            </h1>
            <p className="text-muted-foreground">
              Detalhes e rastreios do cliente
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

      {/* Informações do Cliente */}
      <Card>
        <CardHeader>
          <CardTitle>Informações do Cliente</CardTitle>
          <CardDescription>
            Edite as informações de contato do cliente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Nome *</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value);
                    handleFieldChange();
                  }}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Sobrenome *</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value);
                    handleFieldChange();
                  }}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  handleFieldChange();
                }}
                required
              />
            </div>

            <PhoneField
              label="Telefone / WhatsApp"
              required={false}
              value={phone}
              onChange={(value) => {
                setPhone(value);
                handleFieldChange();
              }}
            />

            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  handleFieldChange();
                }}
                rows={4}
                placeholder="Adicione notas sobre o cliente..."
              />
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Lista de Rastreios */}
      <Card>
        <CardHeader>
          <CardTitle>Rastreios do Cliente</CardTitle>
          <CardDescription>
            {shipments?.length || 0} rastreio{shipments?.length !== 1 ? 's' : ''} cadastrado{shipments?.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingShipments ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : !shipments || shipments.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground">
              <p>Nenhum rastreio cadastrado para este cliente.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código de Rastreio</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Auto-tracking</TableHead>
                    <TableHead>Criado em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shipments.map((shipment) => {
                    const status = statusConfig[shipment.status as keyof typeof statusConfig] || statusConfig.pending;
                    
                    return (
                      <TableRow 
                        key={shipment.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/dashboard/shipments/${shipment.id}`)}
                      >
                        <TableCell className="font-mono font-medium">
                          {shipment.tracking_code}
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {shipment.auto_tracking ? (
                            <Badge variant="outline">Ativo</Badge>
                          ) : (
                            <Badge variant="secondary">Desativado</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(shipment.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
