import { isValidPhoneNumber, parsePhoneNumber } from 'libphonenumber-js';

export function normalizeE164OrThrow(value: string) {
  // value deve vir em E.164 (ex.: +5562992915531) do componente
  if (!isValidPhoneNumber(value)) throw new Error('Telefone inválido');
  const p = parsePhoneNumber(value);
  if (!p) throw new Error('Telefone inválido');
  return {
    e164: p.number,                // +5562992915531
    country: p.country || null,    // BR
    national: p.formatNational(),  // (62) 99291-5531
    international: p.formatInternational(), // +55 62 99291-5531
    countryCallingCode: p.countryCallingCode // 55
  };
}
