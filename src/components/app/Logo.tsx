import { useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { SITE } from '@/config/site.config';

type LogoImageProps = {
  alt?: string;
  className?: string;
  fallbackClassName?: string;
};

export function LogoImage({ alt = 'Tracking AI', className, fallbackClassName }: LogoImageProps) {
  const [failed, setFailed] = useState(false);
  const logoUrl = `${import.meta.env.BASE_URL}logo.png`;

  if (failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={cn(
          'h-8 w-8 shrink-0 rounded-xl bg-gradient-to-br from-primary to-secondary shadow-lg',
          fallbackClassName ?? className,
        )}
      />
    );
  }

  return (
    <img
      src={logoUrl}
      alt={alt}
      className={cn('h-8 w-8 shrink-0', className)}
      loading="eager"
      onError={() => setFailed(true)}
    />
  );
}

type LogoProps = {
  variant?: 'landing' | 'app';
  showText?: boolean;
  className?: string;
  iconClassName?: string;
  textClassName?: string;
};

export default function Logo({
  variant = 'app',
  showText = true,
  className,
  iconClassName,
  textClassName,
}: LogoProps) {
  const href = variant === 'landing' ? '/' : '/dashboard';

  return (
    <Link
      to={href}
      className={cn(
        'flex min-w-0 items-center group',
        showText ? 'gap-2' : 'gap-0',
        className,
      )}
      aria-label={SITE.logoText}
    >
      <LogoImage className={cn('h-8 w-8', iconClassName)} />
      {showText && (
        <span
          className={cn(
            'truncate font-semibold tracking-tight group-hover:opacity-90 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent',
            textClassName,
          )}
        >
          {SITE.logoText}
        </span>
      )}
    </Link>
  );
}
