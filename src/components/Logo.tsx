import { Home } from 'lucide-react';
import { Link } from 'react-router-dom';

interface LogoProps {
  to?: string;
}

export function Logo({ to = '/' }: LogoProps) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-2.5 text-xl font-bold tracking-tight text-indigo-950 dark:text-slate-100 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 rounded-lg"
      aria-label="Roomie home"
    >
      <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600 text-white shadow-sm">
        <Home className="w-4 h-4" strokeWidth={2.25} aria-hidden="true" />
      </span>
      <span className="font-display">Roomie</span>
    </Link>
  );
}
