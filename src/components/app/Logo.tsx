import { Link } from 'react-router-dom';
import { useState } from 'react';

export default function Logo({ variant = 'app' }: { variant?: 'landing' | 'app' }) {
  const href = variant === 'landing' ? '/' : '/dashboard';
  const logoPng = `${import.meta.env.BASE_URL}logo.png`;
  const logoSvg = `${import.meta.env.BASE_URL}logo.svg`;
  const [failed, setFailed] = useState(false);

  return (
    <Link to={href} className="flex items-center gap-2 group min-w-0" aria-label="TrackingAI">
      {/* Tenta SVG e PNG; se falhar, usa fallback em gradiente */}
      {!failed ? (
        <picture>
          <source srcSet={logoSvg} type="image/svg+xml" />
          <img
            src={logoPng}
            alt="TrackingAI"
            className="h-8 w-8 shrink-0"
            loading="eager"
            onError={() => setFailed(true)}
          />
        </picture>
      ) : (
        <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary to-secondary shadow-lg shrink-0" />
      )}
      <span className="font-semibold tracking-tight group-hover:opacity-90 truncate">TrackingAI</span>
    </Link>
  );
}
