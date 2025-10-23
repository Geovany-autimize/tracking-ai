import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AvatarUploader from '@/components/profile/AvatarUploader';
import { useState } from 'react';

export default function ProfilePage() {
  const { customer } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null | undefined>(customer?.avatar_url);

  const initials = customer?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  if (!customer) {
    return (
      <div className="space-y-6 max-w-2xl">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-semibold">Meu Perfil</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie suas informações pessoais
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações Pessoais</CardTitle>
          <CardDescription>
            Atualize seus dados de contato e preferências
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <AvatarUploader
            customerId={customer.id}
            initialUrl={avatarUrl}
            initials={initials}
            onUploadComplete={setAvatarUrl}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo</Label>
              <Input
                id="name"
                defaultValue={customer?.name || ''}
                placeholder="Seu nome"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                defaultValue={customer?.email || ''}
                placeholder="seu@email.com"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="phone">WhatsApp</Label>
              <Input
                id="phone"
                type="tel"
                defaultValue={customer?.whatsapp_e164 || ''}
                placeholder="+55 11 99999-9999"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button>Salvar Alterações</Button>
            <Button variant="outline">Cancelar</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Segurança</CardTitle>
          <CardDescription>
            Altere sua senha e configure autenticação de dois fatores
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline">Alterar Senha</Button>
          <Button variant="outline">Configurar 2FA</Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Zona de Perigo</CardTitle>
          <CardDescription>
            Ações irreversíveis relacionadas à sua conta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive">Excluir Conta</Button>
        </CardContent>
      </Card>
    </div>
  );
}
