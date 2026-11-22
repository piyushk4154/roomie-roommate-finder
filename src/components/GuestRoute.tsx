import { Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';

export function GuestRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f7f4] dark:bg-slate-950 flex flex-col items-center justify-center px-4">
        <div className="inline-flex items-center gap-3 text-stone-600 dark:text-slate-300 text-sm font-medium">
          <Loader2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-spin" aria-hidden="true" />
          <span>Loading Roomie...</span>
        </div>
      </div>
    );
  }

  if (user) {
    const role = user.role === 'owner' ? 'owner' : 'student';
    const fallbackHome = role === 'owner' ? '/owner' : '/dashboard';
    const from = (location.state as { from?: string } | null)?.from;
    const isCompatibleFrom =
      from &&
      from !== '/login' &&
      from !== '/signup' &&
      (role === 'owner' ? from.startsWith('/owner') : !from.startsWith('/owner'));
    return <Navigate to={isCompatibleFrom ? from : fallbackHome} replace />;
  }

  return <>{children}</>;
}
