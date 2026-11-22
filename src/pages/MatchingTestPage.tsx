import { ArrowLeft, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardNavbar } from '../components/DashboardNavbar';
import { useAuth } from '../services/AuthContext';
import { getAllMatchableProfiles, getProfile } from '../services/profileService';
import type { RoommateProfile } from '../services/types';
import { getMatches, type MatchComparisonResult } from '../utils/matching';

export function MatchingTestPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<Array<{ result: MatchComparisonResult; profile: RoommateProfile }>>([]);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!user?.uid) return;
      const [mine, all] = await Promise.all([getProfile(user.uid), getAllMatchableProfiles()]);
      if (!active || !mine) {
        if (active) setLoading(false);
        return;
      }
      const map = new Map(all.map((p) => [p.userId, p]));
      const scored = getMatches(mine, all)
        .map((result) => ({ result, profile: map.get(result.userId)! }))
        .filter((x) => Boolean(x.profile));
      setResults(scored);
      setLoading(false);
    }
    void load();
    return () => {
      active = false;
    };
  }, [user?.uid]);

  return (
    <div className="min-h-screen bg-[#f8f7f4] dark:bg-slate-950 text-stone-900 dark:text-slate-100">
      <DashboardNavbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-2xl font-bold text-indigo-950 dark:text-slate-100">
            Matching Engine Diagnostic
          </h1>
          <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-700 dark:text-indigo-400">
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>Back to matches</span>
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-stone-600 dark:text-slate-300">
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            <span>Running matching comparisons...</span>
          </div>
        ) : (
          <div className="space-y-3">
            {results.map(({ result, profile }) => (
              <div key={profile.userId} className="bg-white dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-2xl p-4 shadow-sm dark:shadow-none flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-indigo-950 dark:text-slate-100">
                    {profile.basics.name} ({profile.housing.preferredCity})
                  </p>
                  <p className="text-xs text-stone-600 dark:text-slate-300 mt-0.5">{result.summary}</p>
                </div>
                <span
                  className={`text-sm font-bold tabular-nums shrink-0 ${
                    result.excluded
                      ? 'text-rose-700 dark:text-rose-400'
                      : 'text-emerald-700 dark:text-emerald-400'
                  }`}
                >
                  {result.excluded ? 'Excluded' : `${result.score}%`}
                </span>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
