import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useAutoRecharge } from '@/hooks/use-auto-recharge';
import { Trash2, Check, Info, ChevronDown } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSearchParams } from 'react-router-dom';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { usePlanRestrictions } from '@/hooks/use-plan-restrictions';
import { PremiumFeatureBadge } from '@/components/ui/premium-feature-badge';

const STORAGE_KEY = 'trackingai:auto-recharge-expanded';

const StatusDot = ({ active }: { active: boolean }) => (
  <span
    aria-hidden
    className={cn(
      'inline-flex h-2.5 w-2.5 rounded-full transition-colors',
      active ? 'bg-green-500 shadow-[0_0_0_4px_rgba(34,197,94,0.15)]' : 'bg-red-500/80 shadow-[0_0_0_4px_rgba(248,113,113,0.1)]'
    )}
  />
);

const SummaryItem = ({
  label,
  value,
  prefix,
  description,
  children,
}: {
  label: string;
  value?: string;
  prefix?: ReactNode;
  description?: string;
  children?: ReactNode;
}) => (
  <div className="space-y-1">
    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
    {children ? (
      children
    ) : (
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground/90">
        {prefix}
        {value && <span>{value}</span>}
      </div>
    )}
    {description && (
      <p className="text-xs text-muted-foreground font-normal">{description}</p>
    )}
  </div>
);

const CARD_BRAND_META: Record<string, { label: string; className: string }> = {
  visa: { label: 'Visa', className: 'bg-[#1a1f71] text-white' },
  mastercard: {
    label: 'MC',
    className: 'bg-gradient-to-r from-[#eb001b] via-[#f79e1b] to-[#004a97] text-white',
  },
  amex: { label: 'Amex', className: 'bg-[#016fd0] text-white' },
  elo: { label: 'Elo', className: 'bg-[#0f1115] text-white' },
  hipercard: { label: 'Hiper', className: 'bg-[#b21e3b] text-white' },
  default: { label: 'Card', className: 'bg-muted text-foreground' },
};

const CardBrandBadge = ({ brand }: { brand?: string }) => {
  const key = brand?.toLowerCase() ?? 'default';
  const meta = CARD_BRAND_META[key] ?? CARD_BRAND_META.default;

  return (
    <span
      role="img"
      aria-label={meta.label}
      className={cn(
        'inline-flex h-8 min-w-[48px] items-center justify-center rounded-md px-2 text-[11px] font-semibold uppercase tracking-wide shadow-sm ring-1 ring-border/60',
        meta.className,
        key === 'default' && 'text-foreground/70'
      )}
    >
      {meta.label}
    </span>
  );
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value);

export const AutoRechargeCard = () => {
  const {
    settings,
    loading,
    processing,
    setupPaymentMethod,
    updateSettings,
    removePaymentMethod,
    toggleEnabled,
    confirmSetup,
  } = useAutoRecharge();

  const { canUseAutoRecharge, isFreePlan } = usePlanRestrictions();
  const [searchParams, setSearchParams] = useSearchParams();
  const [minCredits, setMinCredits] = useState('100');
  const [rechargeAmount, setRechargeAmount] = useState('500');
  const [expanded, setExpanded] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(STORAGE_KEY) === 'true';
  });

  // Confirmar setup quando voltar do Stripe
  useEffect(() => {
    const setupSuccess = searchParams.get('setup');
    const sessionId = searchParams.get('session_id');
    
    if (setupSuccess === 'success' && sessionId) {
      confirmSetup(sessionId).then(() => {
        // Limpar query params
        searchParams.delete('setup');
        searchParams.delete('session_id');
        setSearchParams(searchParams);
      });
    }
  }, [searchParams, confirmSetup, setSearchParams]);

  // Atualizar valores locais quando settings mudar
  useEffect(() => {
    if (settings) {
      setMinCredits(String(settings.min_credits_threshold));
      setRechargeAmount(String(settings.recharge_amount));
    }
  }, [settings]);

  const hasPaymentMethod = !!settings?.stripe_payment_method_id;
  const isEnabled = settings?.enabled || false;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, expanded ? 'true' : 'false');
    }
  }, [expanded]);

  const parsedMinCredits = minCredits.trim() === '' ? null : Number(minCredits);
  const parsedRechargeAmount = rechargeAmount.trim() === '' ? null : Number(rechargeAmount);

  const hasUnsavedChanges = useMemo(() => {
    if (!settings) return false;
    const minChanged =
      parsedMinCredits === null
        ? false
        : parsedMinCredits !== settings.min_credits_threshold;
    const rechargeChanged =
      parsedRechargeAmount === null
        ? false
        : parsedRechargeAmount !== settings.recharge_amount;

    return minChanged || rechargeChanged;
  }, [settings, parsedMinCredits, parsedRechargeAmount]);

  const paymentDetails = settings?.last_payment_method_details;
  const paymentPrimary = paymentDetails?.last4
    ? `•••• ${paymentDetails.last4}`
    : hasPaymentMethod
      ? 'Cartão configurado'
      : 'Nenhum configurado';
  const paymentSecondary = paymentDetails?.exp_month && paymentDetails?.exp_year
    ? `Expira em ${String(paymentDetails.exp_month).padStart(2, '0')}/${String(paymentDetails.exp_year).slice(-2)}`
    : hasPaymentMethod
      ? 'Atualize os dados do cartão quando necessário.'
      : 'Conecte um cartão para ativar a recarga automática.';

  const minCreditsDisplayValue = parsedMinCredits === null ? null : parsedMinCredits;
  const rechargeAmountDisplayValue = parsedRechargeAmount === null ? null : parsedRechargeAmount;

  const minSummaryValue = minCreditsDisplayValue === null ? '—' : `${minCreditsDisplayValue} créditos`;
  const rechargeSummaryValue =
    rechargeAmountDisplayValue === null ? '—' : `${rechargeAmountDisplayValue} créditos`;

  const rechargeCurrencyText =
    rechargeAmountDisplayValue === null ? null : formatCurrency(rechargeAmountDisplayValue * 0.5);

  const minDetailDescription =
    minCreditsDisplayValue === null
      ? 'Defina o limite mínimo que dispara uma recarga automática.'
      : `Quando o saldo cair abaixo de ${minCreditsDisplayValue} créditos, uma recarga será iniciada automaticamente.`;

  const rechargeDetailDescription =
    rechargeAmountDisplayValue === null
      ? 'Informe quantos créditos deseja adicionar em cada recarga.'
      : `Recarregaremos ${rechargeSummaryValue}${rechargeCurrencyText ? ` (≈ ${rechargeCurrencyText})` : ''}.`;

  const handleToggleChange = async (checked: boolean) => {
    if (checked && !hasPaymentMethod) {
      toast.info('Configure um método de pagamento antes de ativar a recarga automática.');
      try {
        await setupPaymentMethod();
        setExpanded(true);
      } catch {
        // setupPaymentMethod já gera feedback
      }
      return;
    }

    try {
      await toggleEnabled(checked);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao atualizar status.';
      toast.error(message);
    }
  };

  const handleSaveSettings = async () => {
    if (parsedMinCredits === null || Number.isNaN(parsedMinCredits)) {
      toast.error('Informe um limite mínimo válido.');
      return;
    }

    if (parsedMinCredits < 50 || parsedMinCredits > 1000) {
      toast.error('O limite mínimo deve ficar entre 50 e 1000 créditos.');
      return;
    }

    if (parsedRechargeAmount === null || Number.isNaN(parsedRechargeAmount)) {
      toast.error('Informe a quantidade de créditos para recarregar.');
      return;
    }

    if (parsedRechargeAmount < 100 || parsedRechargeAmount > 5000) {
      toast.error('A recarga deve ficar entre 100 e 5000 créditos.');
      return;
    }

    try {
      await updateSettings({
        min_credits_threshold: parsedMinCredits,
        recharge_amount: parsedRechargeAmount,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro ao salvar configurações.';
      toast.error(message);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Recarga Automática
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {isFreePlan && (
        <div className="mb-4">
          <PremiumFeatureBadge
            title="Recarga Automática - Premium"
            description="Mantenha suas operações sempre ativas com recarga automática de créditos. Disponível no plano Premium."
            feature="auto_recharge"
          />
        </div>
      )}

      <Card
        className={cn(
          'border border-border/60 transition-all duration-300',
          isFreePlan && 'opacity-60 pointer-events-none',
          isEnabled
            ? 'border-green-500/40 shadow-[0_24px_60px_rgba(34,197,94,0.16)] ring-2 ring-green-500/30'
            : 'hover:border-border'
        )}
      >
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle>Recarga Automática</CardTitle>
          <CardDescription>
            Automatize a compra de créditos sempre que o saldo atingir o limite definido.
          </CardDescription>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">Status</span>
          <Switch
            id="auto-recharge-enabled"
            checked={isEnabled}
            onCheckedChange={handleToggleChange}
            disabled={processing || isFreePlan}
            aria-label="Ativar recarga automática"
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="rounded-2xl border border-border/70 bg-muted/40 p-4 backdrop-blur-sm">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryItem
              label="Status"
              prefix={<StatusDot active={isEnabled} />}
              value={isEnabled ? 'Ativada' : 'Desativada'}
            />
            <SummaryItem label="Pagamento">
              <div className="flex items-center gap-3 text-sm font-semibold text-foreground/90">
                <CardBrandBadge brand={paymentDetails?.brand} />
                <div className="leading-tight">
                  <p>{paymentPrimary}</p>
                  {paymentSecondary && (
                    <p className="mt-0.5 text-xs font-normal text-muted-foreground">{paymentSecondary}</p>
                  )}
                </div>
              </div>
            </SummaryItem>
            <SummaryItem
              label="Limite mínimo"
              value={minSummaryValue}
            />
            <SummaryItem
              label="Recarregar"
              value={rechargeSummaryValue}
            />
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Manter o saldo automático evita interrupções no envio de notificações.
            </p>
            {hasPaymentMethod ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExpanded((prev) => !prev)}
                disabled={processing}
                className="flex items-center gap-2 self-start sm:self-auto"
              >
                <span>{expanded ? 'Ocultar detalhes' : 'Editar detalhes'}</span>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 transition-transform',
                    expanded ? 'rotate-180' : 'rotate-0'
                  )}
                />
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={async () => {
                  await setupPaymentMethod();
                  setExpanded(true);
                }}
                disabled={processing}
                className="self-start sm:self-auto"
              >
                Configurar método de pagamento
              </Button>
            )}
          </div>
        </div>

        <Collapsible open={expanded && hasPaymentMethod}>
          <CollapsibleContent className="space-y-6">
            {hasPaymentMethod && paymentDetails && (
              <div className="space-y-2">
                <Label>Método de pagamento</Label>
                <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="shrink-0">
                      <CardBrandBadge brand={paymentDetails.brand} />
                    </div>
                    <div className="leading-tight">
                      <p className="text-sm font-semibold text-foreground">•••• {paymentDetails.last4}</p>
                      {paymentDetails.exp_month && paymentDetails.exp_year && (
                        <p className="mt-0.5 text-xs text-muted-foreground font-normal">
                          Expira em {String(paymentDetails.exp_month).padStart(2, '0')}/{String(paymentDetails.exp_year).slice(-2)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        await setupPaymentMethod();
                        setExpanded(true);
                      }}
                      disabled={processing}
                    >
                      Alterar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={removePaymentMethod}
                      disabled={processing}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="min-credits">Limite mínimo</Label>
                <Input
                  id="min-credits"
                  type="number"
                  min={50}
                  max={1000}
                  value={minCredits}
                  onChange={(e) => setMinCredits(e.target.value)}
                  disabled={processing}
                />
                <p className="text-xs text-muted-foreground">{minDetailDescription}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="recharge-amount">Recarregar</Label>
                <Input
                  id="recharge-amount"
                  type="number"
                  min={100}
                  max={5000}
                  step={50}
                  value={rechargeAmount}
                  onChange={(e) => setRechargeAmount(e.target.value)}
                  disabled={processing}
                />
                <p className="text-xs text-muted-foreground">{rechargeDetailDescription}</p>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Garanta um limite mínimo compatível com o volume médio diário para evitar pausas no envio de notificações.
                </AlertDescription>
              </Alert>

              <Button
                onClick={handleSaveSettings}
                disabled={processing || !hasUnsavedChanges}
                variant="default"
                className="w-full"
              >
                <Check className="mr-2 h-4 w-4" />
                Salvar configurações
              </Button>
            </div>
        </CollapsibleContent>
      </Collapsible>
    </CardContent>
  </Card>
    </>
  );
};
