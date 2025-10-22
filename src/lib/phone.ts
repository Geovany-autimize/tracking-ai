import {
  AsYouType,
  parsePhoneNumberFromString,
  isValidPhoneNumber,
  getCountries,
  getCountryCallingCode,
} from 'libphonenumber-js';

const regionNames = new Intl.DisplayNames(['pt-BR'], { type: 'region' });

export function getCountryList() {
  return getCountries()
    .map((iso2) => {
      const dial = getCountryCallingCode(iso2 as any);
      const name = regionNames.of(iso2.toUpperCase()) || iso2.toUpperCase();
      return { iso2, name, dialCode: `+${dial}` };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

export function formatNational(digits: string, iso2?: string) {
  const typer = new AsYouType(iso2 as any);
  typer.input(digits);
  return typer.getNationalNumber();
}

// novo: obtém DDI pelo ISO2 (ex.: 'BR' -> '55')
export function getDialFromIso(iso2?: string) {
  try { return getCountryCallingCode((iso2 || '').toUpperCase() as any); }
  catch { return ''; }
}

// constrói E.164 a partir de iso + dígitos
export function toE164FromCountry(iso2: string, digits: string) {
  const ddi = getDialFromIso(iso2);
  const raw = `+${ddi}${digits.replace(/\D/g, '')}`;
  const pn = parsePhoneNumberFromString(raw as any);
  if (pn && pn.isValid()) return pn.number;
  return '';
}

// quando o usuário cola/digita algo começando por '+', tenta parsear direto
export function parseDirectE164(input: string) {
  const pn = parsePhoneNumberFromString(input);
  if (pn && pn.isValid()) {
    return {
      e164: pn.number,
      iso2: pn.country || null,
      national: pn.formatNational(),
    };
  }
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
