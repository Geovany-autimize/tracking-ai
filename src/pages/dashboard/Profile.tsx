import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, LogOut, ShieldCheck, Smartphone, UserCog, XCircle } from 'lucide-react';
import { format } from 'date-fns';

import AvatarUploader from '@/components/profile/AvatarUploader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import PhoneFieldPro from '@/components/forms/PhoneFieldPro';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

const profileSchema = z.object({
  name: z
    .string()
    .min(2, 'Informe pelo menos 2 caracteres')
    .max(80, 'Nome muito longo')
    .transform((value) => value.trim()),
  email: z.string().email('E-mail inválido'),
  whatsapp_e164: z
    .string()
    .optional()
    .transform((value) => value || '')
    .refine((value) => value === '' || value.startsWith('+'), 'Número deve incluir o DDI (+55...)'),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

function getInitials(name?: string | null) {
  if (!name) return 'Usuário';
  const parts = name.trim().split(' ');
  if (parts.length === 0) return 'Usuário';
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

export default function ProfilePage() {
  const { customer, refreshSession } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null | undefined>(customer?.avatar_url);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: customer?.name ?? '',
      email: customer?.email ?? '',
      whatsapp_e164: customer?.whatsapp_e164 ?? '',
    },
    mode: 'onChange',
  });

  useEffect(() => {
    if (customer) {
      form.reset({
        name: customer.name ?? '',
        email: customer.email ?? '',
        whatsapp_e164: customer.whatsapp_e164 ?? '',
      });
      setAvatarUrl(customer.avatar_url);
    }
  }, [customer, form]);

  // bloqueia saída com alterações pendentes
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (form.formState.isDirty) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [form.formState.isDirty]);

  const accountCreatedAt = useMemo(() => {
    if (!customer?.created_at) return null;
    const date = new Date(customer.created_at);
    return Number.isNaN(date.getTime()) ? null : format(date, "dd 'de' MMMM yyyy");
  }, [customer?.created_at]);

  async function onSubmit(values: ProfileFormValues) {
    if (!customer?.id) return;
    setSaving(true);
    try {
      const payload: Record<string, string | null> = {
        name: values.name,
        whatsapp_e164: values.whatsapp_e164 || null,
      };

      const { error } = await supabase.from('customers').update(payload).eq('id', customer.id);
      if (error) throw error;

      await refreshSession();
      form.reset(values);
      toast({
        title: 'Perfil atualizado',
        description: 'Suas informações foram salvas com sucesso.',
      });
    } catch (error: any) {
      console.error('[Profile] Failed to update profile', error);
      toast({
        title: 'Erro ao salvar',
        description: error?.message || 'Não foi possível atualizar o perfil.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  const initials = getInitials(customer?.name);

  if (!customer) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex items-center gap-3 py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Carregando dados do perfil…</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const dirty = form.formState.isDirty;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <AvatarUploader
            customerId={customer.id}
            initialUrl={avatarUrl}
            initials={initials
              .split(' ')
              .map((part) => part[0])
              .join('')
              .slice(0, 2)}
            onUploadComplete={(url) => {
              setAvatarUrl(url);
              void refreshSession();
            }}
          />
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">{initials}</h1>
            <p className="text-sm text-muted-foreground">{customer.email}</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="border-emerald-500/50 bg-emerald-500/10 text-emerald-500">
                Conta ativa
              </Badge>
              {accountCreatedAt && (
                <Badge variant="outline" className="gap-1 text-xs text-muted-foreground">
                  <UserCog className="h-3 w-3" />
                  Criada em {accountCreatedAt}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/dashboard/settings">
              <ShieldCheck className="mr-2 h-4 w-4" />
              Gerenciar conta
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/dashboard/settings/integrations/whatsapp">
              <Smartphone className="mr-2 h-4 w-4" />
              WhatsApp
            </Link>
          </Button>
        </div>
      </header>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="relative overflow-hidden">
            {dirty && (
              <div className="flex flex-col gap-3 border-b border-border/60 bg-muted/60 px-6 py-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 font-medium text-foreground">
                  <UserCog className="h-4 w-4" />
                  Existem alterações não salvas
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      form.reset();
                      setAvatarUrl(customer.avatar_url);
                    }}
                  >
                    Descartar
                  </Button>
                  <Button type="submit" size="sm" disabled={saving || !form.formState.isValid}>
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando…
                      </>
                    ) : (
                      'Salvar alterações'
                    )}
                  </Button>
                </div>
              </div>
            )}
            <CardHeader>
              <CardTitle>Informações pessoais</CardTitle>
              <CardDescription>Mantenha seus dados atualizados para receber relatórios e notificações.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome completo</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Seu nome" autoComplete="name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" readOnly disabled className="cursor-not-allowed bg-muted" />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground">
                        Entre em contato com o suporte caso precise alterar seu e-mail de login.
                      </p>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="whatsapp_e164"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>WhatsApp</FormLabel>
                      <FormControl>
                        <PhoneFieldPro
                          value={field.value || ''}
                          onChange={field.onChange}
                          helperText="Usaremos este número para notificações automáticas e comunicação com clientes."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>
        </form>
      </Form>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Segurança</CardTitle>
            <CardDescription>Proteja sua conta com senha forte e autenticação adicional.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" size="sm" disabled>
              <ShieldCheck className="mr-2 h-4 w-4" />
              Alterar senha (em breve)
            </Button>
            <p className="text-xs text-muted-foreground">
              Em breve você poderá atualizar a senha sem sair do painel. Por enquanto, fale com o suporte caso precise
              de ajuda.
            </p>
            <Button variant="outline" size="sm" disabled>
              <ShieldCheck className="mr-2 h-4 w-4" />
              Ativar autenticação em duas etapas (em breve)
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status do WhatsApp</CardTitle>
            <CardDescription>Acompanhe a conexão e gerencie integrações.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center justify-between rounded-md border border-border/60 bg-muted/40 p-3 text-sm">
              <div>
                <p className="font-semibold">Integração do WhatsApp</p>
                <p className="text-xs text-muted-foreground">
                  Verifique a conexão e ajuste templates na área de integrações.
                </p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to="/dashboard/settings/integrations/whatsapp">Abrir Configuração</Link>
              </Button>
            </div>
            <div className="rounded-md border border-border/60 bg-muted/40 p-3 text-xs text-muted-foreground">
              Dica: conecte o WhatsApp para enviar atualizações automáticas aos clientes e reduzir chamados sobre
              entregas.
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <XCircle className="h-5 w-5" />
            Zona de perigo
          </CardTitle>
          <CardDescription>Ações irreversíveis relacionadas à sua conta.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            A exclusão da conta remove todos os dados de rastreio e clientes associados. Entre em contato com o suporte
            para transferir informações importantes antes de prosseguir.
          </p>
          <Button variant="destructive" onClick={() => setConfirmDeleteOpen(true)}>
            Excluir conta
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível e removerá todos os seus dados. Entre em contato em{' '}
              <a href="mailto:suporte@trackingai.com.br" className="underline">
                suporte@trackingai.com.br
              </a>{' '}
              para solicitar a remoção definitiva.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction asChild>
              <a
                href="mailto:suporte@trackingai.com.br?subject=Solicitação%20de%20exclusão%20de%20conta"
                className="inline-flex items-center justify-center rounded-md bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90"
              >
                Solicitar exclusão
              </a>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
