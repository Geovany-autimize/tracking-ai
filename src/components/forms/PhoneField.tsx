import { PhoneInput, defaultCountries } from 'react-international-phone';
import 'react-international-phone/style.css';
import { useId } from 'react';

type Props = {
  label?: string;
  required?: boolean;
  value: string;
  onChange: (e164: string) => void;
  error?: string;
  defaultCountry?: string;
  helperText?: string;
  name?: string;
};

export default function PhoneField({
  label = 'WhatsApp',
  required = false,
  value,
  onChange,
  error,
  defaultCountry = 'br',
  helperText = 'Selecione o país e digite seu número. Enviaremos avisos importantes por WhatsApp.',
  name = 'whatsapp_e164',
}: Props) {
  const id = useId();

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        {label}{required && <span className="text-destructive"> *</span>}
      </label>

      <PhoneInput
        name={name}
        defaultCountry={defaultCountry as any}
        value={value}
        onChange={onChange}
        countries={defaultCountries}
        className="flex rounded-md border border-input bg-background"
        inputProps={{
          required,
          id,
          className:
            'flex h-10 w-full rounded-md border-0 bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        }}
        disableDialCodePrefill={false}
        hideDropdown={false}
      />

      {helperText && <p className="text-xs text-muted-foreground">{helperText}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
