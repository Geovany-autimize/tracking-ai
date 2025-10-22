import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { getCountryList, formatNational, toE164OrNull } from '@/lib/phone';
import { cn } from '@/lib/utils';

type Props = {
  label?: string;
  required?: boolean;
  value: string;                 // E.164 ou vazio
  onChange: (e164: string) => void;
  error?: string;
  helperText?: string;
  defaultCountry?: string;       // ex.: 'BR'
  name?: string;                 // ex.: 'whatsapp_e164'
};

function isoToFlagEmoji(iso2?: string) {
  if (!iso2) return '🏳️';
  return iso2
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

export default function PhoneFieldPro({
  label = 'WhatsApp',
  required = false,
  value,
  onChange,
  error,
  helperText = 'Selecione o país (ou digite o DDI) e informe seu número.',
  defaultCountry = 'BR',
  name = 'whatsapp_e164',
}: Props) {
  const id = useId();
  const allCountries = useMemo(() => getCountryList(), []);
  const def = allCountries.find((c) => c.iso2.toUpperCase() === defaultCountry.toUpperCase()) || allCountries[0];

  // Estado interno: país selecionado, DDI (editável), e dígitos do número
  const [countryIso, setCountryIso] = useState(def.iso2);
  const [ddi, setDdi] = useState(def.dialCode.replace('+',''));
  const [digits, setDigits] = useState(''); // apenas números
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const popRef = useRef<HTMLDivElement>(null);

  // Se "value" (E.164) vier preenchido externamente, derive os campos (opcional)
  useEffect(() => {
    if (!value) return;
    // Mantemos simples: mostre apenas no input principal; edição posterior rederiva
  }, [value]);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!popRef.current) return;
      if (!popRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  // Lista filtrada por nome, iso ou DDI (+55, 55, br, brasil)
  const filtered = useMemo(() => {
    const text = q.trim().toLowerCase().replace('+','');
    if (!text) return allCountries;
    return allCountries.filter((c) => {
      return (
        c.name.toLowerCase().includes(text) ||
        c.iso2.toLowerCase().includes(text) ||
        c.dialCode.replace('+','') === text ||
        c.dialCode.replace('+','').startsWith(text)
      );
    });
  }, [q, allCountries]);

  // Atualiza E.164 sempre que DDI/dígitos mudarem
  useEffect(() => {
    const e164 = toE164OrNull(ddi, digits);
    if (e164) onChange(e164);
    else onChange('');
  }, [ddi, digits, onChange]);

  // Se o usuário editar o DDI manualmente e corresponder a algum país, sincronize a bandeira
  useEffect(() => {
    const match = allCountries.find((c) => c.dialCode.replace('+','') === ddi);
    if (match) setCountryIso(match.iso2);
  }, [ddi, allCountries]);

  const flag = isoToFlagEmoji(countryIso);
  const national = formatNational(digits, countryIso);

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        {label}{required && <span className="text-destructive"> *</span>}
      </label>

      <div className="flex items-stretch gap-2">
        {/* Seletor de país (abre dropdown) */}
        <div className="relative" ref={popRef}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className={cn(
              'h-10 min-w-[56px] rounded-md border border-input bg-background px-3 text-lg',
              'hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
            )}
            aria-haspopup="listbox"
            aria-expanded={open}
          >
            <span aria-hidden>{flag}</span>
          </button>

          {open && (
            <div
              className="absolute z-50 mt-2 w-[320px] rounded-md border border-input bg-popover shadow-lg"
              role="listbox"
            >
              <div className="p-2 border-b border-border">
                <input
                  autoFocus
                  placeholder="Buscar país ou DDI (+55)…"
                  className="w-full rounded-md bg-background px-3 py-2 text-sm outline-none border border-input focus:ring-2 focus:ring-ring"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
              <div className="max-h-72 overflow-auto py-1">
                {filtered.map((c) => (
                  <button
                    key={c.iso2}
                    type="button"
                    className={cn(
                      'w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground',
                      c.iso2 === countryIso && 'bg-accent'
                    )}
                    onClick={() => {
                      setCountryIso(c.iso2);
                      setDdi(c.dialCode.replace('+',''));
                      setOpen(false);
                      setQ('');
                    }}
                  >
                    <span className="mr-2">{isoToFlagEmoji(c.iso2)}</span>
                    {c.name} <span className="text-muted-foreground">{c.dialCode}</span>
                  </button>
                ))}
                {filtered.length === 0 && (
                  <div className="px-3 py-4 text-sm text-muted-foreground">Nada encontrado</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* DDI EDITÁVEL */}
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground">+</span>
          <input
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={3}
            value={ddi}
            onChange={(e) => setDdi(e.target.value.replace(/\D/g, '').slice(0,3))}
            className="w-16 h-10 rounded-md bg-background border border-input px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            aria-label="Código do país (DDI)"
          />
        </div>

        {/* Número nacional com máscara */}
        <div className="flex-1">
          <input
            id={id}
            name={name}
            inputMode="numeric"
            autoComplete="tel"
            placeholder="(62) 99291-5531"
            value={national}
            onChange={(e) => {
              // Mantém apenas dígitos internamente
              const onlyDigits = e.target.value.replace(/\D/g, '').slice(0, 20);
              setDigits(onlyDigits);
            }}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            required={required}
          />
        </div>
      </div>

      {helperText && <p className="text-xs text-muted-foreground">{helperText}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
