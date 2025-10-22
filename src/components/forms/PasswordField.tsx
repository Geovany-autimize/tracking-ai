import { useId, useState } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  label?: string;
  name?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  minLength?: number;
  placeholder?: string;
  error?: string;
  helperText?: string;
  className?: string;
};

export default function PasswordField({
  label = 'Senha',
  name = 'password',
  value,
  onChange,
  required = true,
  minLength = 8,
  placeholder = '••••••••',
  error,
  helperText = `Mínimo ${minLength} caracteres`,
  className,
}: Props) {
  const id = useId();
  const [show, setShow] = useState(false);
  const [caps, setCaps] = useState(false);

  return (
    <div className={cn('space-y-2', className)}>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}{required && <span className="text-red-400"> *</span>}
      </label>

      <div className="relative">
        <input
          id={id}
          name={name}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyUp={(e) => setCaps((e.getModifierState && e.getModifierState('CapsLock')) || false)}
          required={required}
          minLength={minLength}
          placeholder={placeholder}
          autoComplete="current-password"
          className="w-full h-11 px-4 pr-12 rounded-xl bg-background border border-input focus:outline-none focus:ring-2 focus:ring-ring"
          aria-invalid={!!error}
          aria-describedby={`${id}-help ${error ? id+'-err' : ''}`}
        />

        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
          aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
        >
          {show ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              <path d="M10.58 10.58A3 3 0 0012 15a3 3 0 002.42-4.42M9.88 5.1A10.94 10.94 0 0121 12c-1.26 2.4-3.22 4.27-5.58 5.37M3 12c1.26-2.4 3.22-4.27 5.58-5.37" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6"/>
            </svg>
          )}
        </button>
      </div>

      <div id={`${id}-help`} className="text-xs text-muted-foreground">
        {helperText} {caps && <span className="ml-2 text-amber-400">Caps Lock ativado</span>}
      </div>
      {error && <div id={`${id}-err`} className="text-xs text-destructive">{error}</div>}
    </div>
  );
}
