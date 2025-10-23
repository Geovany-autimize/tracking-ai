import { Link } from 'react-router-dom';

export default function Logo({ variant = 'app' }: { variant?: 'landing' | 'app' }) {
  const href = variant === 'landing' ? '/' : '/dashboard';
  
  return (
    <Link to={href} className="flex items-center gap-2 group min-w-0" aria-label="TrackingAI">
      <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary to-secondary shadow-lg shrink-0" />
      <span className="font-semibold tracking-tight group-hover:opacity-90 truncate">TrackingAI</span>
    </Link>
  );
}
