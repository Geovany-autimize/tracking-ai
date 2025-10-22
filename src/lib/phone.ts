import {
  AsYouType,
  parsePhoneNumberFromString,
  isValidPhoneNumber,
  getCountries,
  getCountryCallingCode,
} from 'libphonenumber-js';

// Nome do país a partir do código ISO (localizado)
const regionNames = new Intl.DisplayNames(['pt-BR'], { type: 'region' });

// Gera lista de países: { iso2, name, dialCode }
export function getCountryList() {
  return getCountries()
    .map((iso2) => {
      const dial = getCountryCallingCode(iso2 as any);
      const name = regionNames.of(iso2.toUpperCase()) || iso2.toUpperCase();
      return { iso2, name, dialCode: `+${dial}` };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

// Formata número nacional ao digitar (com base no país)
// digits: somente números (sem espaços/hífens)
export function formatNational(digits: string, iso2?: string) {
  const typer = new AsYouType(iso2 as any);
  typer.input(digits);
  // AsYouType com país definido já aplica formato nacional
  return typer.getNationalNumber();
}

// Constrói e valida E.164 a partir de DDI e dígitos
export function toE164OrNull(ddi: string, digits: string) {
  const raw = `+${ddi.replace(/\D/g, '')}${digits.replace(/\D/g, '')}`;
  const pn = parsePhoneNumberFromString(raw as any);
  if (pn && pn.isValid()) return pn.number; // E.164
  return null;
}

export function isValidE164(e164: string) {
  try { return isValidPhoneNumber(e164 as any); } catch { return false; }
}

export function normalizeE164OrThrow(value: string) {
  // value deve vir em E.164 (ex.: +5562992915531) do componente
  if (!isValidPhoneNumber(value)) throw new Error('Telefone inválido');
  const p = parsePhoneNumberFromString(value);
  if (!p) throw new Error('Telefone inválido');
  return {
    e164: p.number,                // +5562992915531
    country: p.country || null,    // BR
    national: p.formatNational(),  // (62) 99291-5531
    international: p.formatInternational(), // +55 62 99291-5531
    countryCallingCode: p.countryCallingCode // 55
  };
}
