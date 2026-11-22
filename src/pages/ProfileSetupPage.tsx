import { Loader2, LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Footer } from '../components/Footer';
import { Logo } from '../components/Logo';
import { ProfileFormWizard } from '../components/ProfileFormWizard';
import { useAuth } from '../services/AuthContext';
import { getProfile } from '../services/profileService';
import type { RoommateProfile } from '../services/types';

export function ProfileSetupPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [existingProfile, setExistingProfile] = useState<RoommateProfile | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!user?.uid) {
        if (active) setLoading(false);
        return;
      }
      try {
        const profile = await getProfile(user.uid);
        if (active) {
          setExistingProfile(profile);
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [user?.uid]);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#f8f7f4] text-stone-900 flex flex-col">
      <header className="w-full border-b border-stone-200/90 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Logo to={existingProfile?.isComplete ? '/dashboard' : '/'} />
          <div className="flex items-center gap-3">
            {existingProfile?.isComplete && (
              <Link
                to="/dashboard"
                className="text-sm font-semibold text-indigo-700 hover:underline px-2 py-2"
              >
                Back to matches
              </Link>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-xl border border-stone-200 text-sm font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="max-w-3xl mx-auto mb-6">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-indigo-950 tracking-tight">
            {existingProfile?.isComplete ? 'Update your roommate profile' : 'Set up your roommate profile'}
          </h1>
          <p className="text-sm sm:text-base text-stone-600 mt-1.5">
            {user?.name ? `Hi ${user.name}, ` : ''}share your daily routine and housing budget so we
            can match you with compatible students.
          </p>
        </div>

        {loading ? (
          <div className="max-w-3xl mx-auto bg-white rounded-2xl p-10 shadow-sm flex items-center justify-center gap-3 text-sm text-stone-600">
            <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" aria-hidden="true" />
            <span>Loading your profile setup...</span>
          </div>
        ) : (
          <ProfileFormWizard
            initialProfile={existingProfile}
            mode="setup"
            onSaved={() => navigate('/dashboard', { replace: true })}
          />
        )}
      </main>

      <Footer />
    </div>
  );
}
