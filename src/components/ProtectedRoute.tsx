import { Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';
import type { AccountRole } from '../services/types';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: AccountRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f7f4] dark:bg-slate-950 flex flex-col items-center justify-center px-4">
        <div className="inline-flex items-center gap-3 text-stone-600 dark:text-slate-300 text-sm font-medium">
          <Loader2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-spin" aria-hidden="true" />
          <span>Checking your Roomie session...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    const requestedPath = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to="/login" replace state={{ from: requestedPath }} />;
  }

  const role: AccountRole = user.role === 'owner' ? 'owner' : 'student';
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to={role === 'owner' ? '/owner' : '/dashboard'} replace />;
  }

  return <>{children}</>;
}
