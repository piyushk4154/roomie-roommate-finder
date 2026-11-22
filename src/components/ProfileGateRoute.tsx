import { Loader2 } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';
import { getProfile } from '../services/profileService';

export function ProfileGateRoute({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [checking, setChecking] = useState(true);
  const [hasCompleteProfile, setHasCompleteProfile] = useState(false);

  useEffect(() => {
    let active = true;
    async function check() {
      if (!user?.uid) {
        if (active) setChecking(false);
        return;
      }
      setChecking(true);
      try {
        const profile = await getProfile(user.uid);
        if (active) {
          setHasCompleteProfile(Boolean(profile?.isComplete));
        }
      } finally {
        if (active) setChecking(false);
      }
    }
    void check();
    return () => {
      active = false;
    };
  }, [user?.uid]);

  if (checking) {
    return (
      <div className="min-h-screen bg-[#f8f7f4] dark:bg-slate-950 flex flex-col items-center justify-center px-4">
        <div className="inline-flex items-center gap-3 text-stone-600 dark:text-slate-300 text-sm font-medium">
          <Loader2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-spin" aria-hidden="true" />
          <span>Loading your Roomie profile...</span>
        </div>
      </div>
    );
  }

  if (!hasCompleteProfile) {
    return <Navigate to="/profile-setup" replace />;
  }

  return <>{children}</>;
}
