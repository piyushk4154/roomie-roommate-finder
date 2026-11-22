import {
  HelpCircle,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { CompatibilityRing } from '../components/CompatibilityRing';
import { DashboardNavbar } from '../components/DashboardNavbar';
import { Footer } from '../components/Footer';
import { formatINR } from '../components/ProfileFormWizard';
import { useAuth } from '../services/AuthContext';
import { getAllMatchableProfiles, getProfile } from '../services/profileService';
import { getBlockedUserIdSet, subscribeToBlocks } from '../services/safetyService';
import type { GenderOption, RoommateProfile } from '../services/types';
import { getMatches, type MatchComparisonResult } from '../utils/matching';

const FILTERS_STORAGE_KEY = 'roomie_match_filters_v1';
const SAFETY_BANNER_DISMISSED_KEY = 'roomie_safety_banner_dismissed_v1';

type SortOption = 'best_match' | 'lowest_budget' | 'newest';

interface FilterState {
  search: string;
  city: string;
  college: string;
  maxBudget: number;
  gender: 'all' | GenderOption;
  minScore: number;
  sortBy: SortOption;
}

const DEFAULT_FILTERS: FilterState = {
  search: '',
  city: 'all',
  college: '',
  maxBudget: 40000,
  gender: 'all',
  minScore: 0,
  sortBy: 'best_match',
};

function loadSavedFilters(): FilterState {
  try {
    const raw = window.sessionStorage.getItem(FILTERS_STORAGE_KEY);
    if (!raw) return DEFAULT_FILTERS;
    return { ...DEFAULT_FILTERS, ...(JSON.parse(raw) as Partial<FilterState>) };
  } catch {
    return DEFAULT_FILTERS;
  }
}

export function MatchesPage() {
  const { user } = useAuth();
  const [myProfile, setMyProfile] = useState<RoommateProfile | null>(null);
  const [candidates, setCandidates] = useState<RoommateProfile[]>([]);
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [filters, setFilters] = useState<FilterState>(loadSavedFilters);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [safetyBannerVisible, setSafetyBannerVisible] = useState(() => {
    try {
      return window.localStorage.getItem(SAFETY_BANNER_DISMISSED_KEY) !== 'true';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      window.sessionStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters));
    } catch {
      // Ignore sessionStorage errors
    }
  }, [filters]);

  useEffect(() => {
    if (!user?.uid) return;
    return subscribeToBlocks(user.uid, (blocks) => {
      setBlockedIds(getBlockedUserIdSet(user.uid, blocks));
    });
  }, [user?.uid]);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!user?.uid) return;
      setLoading(true);
      setLoadError('');
      try {
        const [mine, all] = await Promise.all([
          getProfile(user.uid),
          getAllMatchableProfiles(),
        ]);
        if (active) {
          setMyProfile(mine);
          setCandidates(all);
        }
      } catch (err) {
        if (active) {
          setLoadError(
            err instanceof Error ? err.message : 'Unable to load roommate matches right now.',
          );
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

  const dismissSafetyBanner = () => {
    setSafetyBannerVisible(false);
    try {
      window.localStorage.setItem(SAFETY_BANNER_DISMISSED_KEY, 'true');
    } catch {
      // Ignore
    }
  };

  const matchedPairs = useMemo(() => {
    if (!myProfile) return [];
    const visibleCandidates = candidates.filter(
      (c) => c.userId !== myProfile.userId && !blockedIds.has(c.userId),
    );
    const results = getMatches(myProfile, visibleCandidates);
    const profileMap = new Map(visibleCandidates.map((p) => [p.userId, p]));

    return results
      .filter((r) => !r.excluded)
      .map((result) => ({
        result,
        profile: profileMap.get(result.userId)!,
      }))
      .filter((item) => Boolean(item.profile));
  }, [myProfile, candidates, blockedIds]);

  const availableCities = useMemo(() => {
    const set = new Set<string>();
    matchedPairs.forEach(({ profile }) => {
      if (profile.housing.preferredCity) set.add(profile.housing.preferredCity);
    });
    return Array.from(set).sort();
  }, [matchedPairs]);

  const filteredMatches = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    const collegeFilter = filters.college.trim().toLowerCase();

    const list = matchedPairs.filter(({ result, profile }) => {
      if (q) {
        const hay = `${profile.basics.name} ${profile.basics.college} ${profile.housing.preferredCity}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filters.city !== 'all' && profile.housing.preferredCity !== filters.city) {
        return false;
      }
      if (collegeFilter && !profile.basics.college.toLowerCase().includes(collegeFilter)) {
        return false;
      }
      if (profile.housing.budgetMin > filters.maxBudget) {
        return false;
      }
      if (filters.gender !== 'all' && profile.basics.gender !== filters.gender) {
        return false;
      }
      if (result.score < filters.minScore) {
        return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (filters.sortBy === 'lowest_budget') {
        return a.profile.housing.budgetMin - b.profile.housing.budgetMin;
      }
      if (filters.sortBy === 'newest') {
        return (
          new Date(b.profile.updatedAt).getTime() - new Date(a.profile.updatedAt).getTime()
        );
      }
      return b.result.score - a.result.score;
    });
  }, [matchedPairs, filters]);

  const resetFilters = () => setFilters(DEFAULT_FILTERS);

  const renderFilterControls = () => (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-bold text-indigo-950">Filters</h2>
        <button
          type="button"
          onClick={resetFilters}
          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:underline cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Reset filters</span>
        </button>
      </div>

      <div>
        <label htmlFor="filter-search" className="block text-xs font-semibold text-stone-700 mb-1.5">
          Search name or college
        </label>
        <div className="relative">
          <Search
            className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2"
            aria-hidden="true"
          />
          <input
            id="filter-search"
            type="text"
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            placeholder="e.g. Aarav, IIT..."
            className="w-full min-h-[42px] rounded-xl border border-stone-300 pl-9 pr-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
          />
        </div>
      </div>

      <div>
        <label htmlFor="filter-city" className="block text-xs font-semibold text-stone-700 mb-1.5">
          City
        </label>
        <select
          id="filter-city"
          value={filters.city}
          onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))}
          className="w-full min-h-[42px] rounded-xl border border-stone-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
        >
          <option value="all">All cities</option>
          {availableCities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="filter-college" className="block text-xs font-semibold text-stone-700 mb-1.5">
          College filter
        </label>
        <input
          id="filter-college"
          type="text"
          value={filters.college}
          onChange={(e) => setFilters((f) => ({ ...f, college: e.target.value }))}
          placeholder="Filter by university..."
          className="w-full min-h-[42px] rounded-xl border border-stone-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor="filter-budget" className="text-xs font-semibold text-stone-700">
            Max starting budget
          </label>
          <span className="text-xs font-bold text-indigo-700 tabular-nums">
            Up to {formatINR(filters.maxBudget)}
          </span>
        </div>
        <input
          id="filter-budget"
          type="range"
          min={4000}
          max={40000}
          step={1000}
          value={filters.maxBudget}
          onChange={(e) => setFilters((f) => ({ ...f, maxBudget: Number(e.target.value) }))}
          className="w-full accent-indigo-600 cursor-pointer"
        />
      </div>

      <div>
        <label htmlFor="filter-gender" className="block text-xs font-semibold text-stone-700 mb-1.5">
          Gender
        </label>
        <select
          id="filter-gender"
          value={filters.gender}
          onChange={(e) =>
            setFilters((f) => ({ ...f, gender: e.target.value as FilterState['gender'] }))
          }
          className="w-full min-h-[42px] rounded-xl border border-stone-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
        >
          <option value="all">Any gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor="filter-score" className="text-xs font-semibold text-stone-700">
            Minimum compatibility
          </label>
          <span className="text-xs font-bold text-indigo-700 tabular-nums">{filters.minScore}%+</span>
        </div>
        <input
          id="filter-score"
          type="range"
          min={0}
          max={90}
          step={5}
          value={filters.minScore}
          onChange={(e) => setFilters((f) => ({ ...f, minScore: Number(e.target.value) }))}
          className="w-full accent-indigo-600 cursor-pointer"
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8f7f4] text-stone-900 flex flex-col">
      <DashboardNavbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {safetyBannerVisible && (
          <div className="mb-6 bg-indigo-50/90 border border-indigo-200 rounded-2xl px-4 py-3.5 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-indigo-700 shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-xs sm:text-sm text-indigo-950 leading-relaxed">
                <strong>Stay safe on Roomie:</strong> Always meet prospective roommates in public
                campus places first, and never send money or share OTPs online before visiting a place.
              </p>
            </div>
            <button
              type="button"
              onClick={dismissSafetyBanner}
              className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-indigo-700 hover:bg-indigo-100 shrink-0 cursor-pointer"
              aria-label="Dismiss safety tip"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Top header & sort controls */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-7">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-indigo-950 tracking-tight">
              Welcome, {myProfile?.basics.name || user?.name || 'Student'}
            </h1>
            <p className="text-sm text-stone-600 mt-1 tabular-nums">
              {loading
                ? 'Finding your compatible roommates...'
                : `${filteredMatches.length} compatible ${filteredMatches.length === 1 ? 'roommate' : 'roommates'} found`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setHowItWorksOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[42px] rounded-xl bg-white border border-stone-200 text-xs sm:text-sm font-semibold text-stone-700 hover:text-indigo-700 hover:border-indigo-200 transition-colors cursor-pointer"
            >
              <HelpCircle className="w-4 h-4" aria-hidden="true" />
              <span>How matching works</span>
            </button>

            <button
              type="button"
              onClick={() => setMobileFiltersOpen(true)}
              className="lg:hidden inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[42px] rounded-xl bg-white border border-stone-200 text-xs sm:text-sm font-semibold text-stone-700 cursor-pointer"
            >
              <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
              <span>Filters</span>
            </button>

            <select
              aria-label="Sort matches"
              value={filters.sortBy}
              onChange={(e) =>
                setFilters((f) => ({ ...f, sortBy: e.target.value as SortOption }))
              }
              className="min-h-[42px] rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs sm:text-sm font-semibold text-stone-700 focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
            >
              <option value="best_match">Sort: Best match</option>
              <option value="lowest_budget">Sort: Lowest budget</option>
              <option value="newest">Sort: Newest</option>
            </select>
          </div>
        </div>

        {loadError && (
          <div
            role="alert"
            className="mb-6 rounded-2xl bg-rose-50 border border-rose-200 px-5 py-4 text-sm text-rose-800"
          >
            {loadError}
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-7 items-start">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-72 shrink-0 bg-white rounded-2xl p-6 shadow-[0_2px_16px_-4px_rgba(26,25,43,0.07)] sticky top-24">
            {renderFilterControls()}
          </aside>

          {/* Matches Grid */}
          <div className="flex-1 w-full">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {[1, 2, 3, 4].map((n) => (
                  <div
                    key={n}
                    className="bg-white rounded-2xl p-6 shadow-sm animate-pulse space-y-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-stone-200" />
                        <div className="space-y-2">
                          <div className="h-4 w-32 bg-stone-200 rounded" />
                          <div className="h-3 w-24 bg-stone-200 rounded" />
                        </div>
                      </div>
                      <div className="w-14 h-14 rounded-full bg-stone-200" />
                    </div>
                    <div className="h-3 w-full bg-stone-200 rounded" />
                    <div className="h-3 w-2/3 bg-stone-200 rounded" />
                  </div>
                ))}
              </div>
            ) : filteredMatches.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 sm:p-12 text-center shadow-[0_2px_16px_-4px_rgba(26,25,43,0.07)]">
                <h2 className="font-display text-xl font-bold text-indigo-950 mb-2">
                  No matches match these filters yet
                </h2>
                <p className="text-sm text-stone-600 max-w-md mx-auto leading-relaxed mb-6">
                  Try widening your maximum budget, lowering the minimum compatibility threshold, or
                  clearing city and college filters to see more compatible students.
                </p>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" aria-hidden="true" />
                  <span>Reset filters</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filteredMatches.map(({ result, profile }) => (
                  <MatchProfileCard key={profile.userId} profile={profile} result={result} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Mobile Filter Drawer */}
      {mobileFiltersOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden flex justify-end bg-stone-950/45 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-label="Filter matches"
        >
          <div className="w-full max-w-xs bg-white h-full overflow-y-auto p-6 shadow-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-5">
                <span className="font-display text-base font-bold text-indigo-950">
                  Filter matches
                </span>
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(false)}
                  className="w-10 h-10 inline-flex items-center justify-center rounded-xl text-stone-500 hover:bg-stone-100 cursor-pointer"
                  aria-label="Close filters"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {renderFilterControls()}
            </div>

            <button
              type="button"
              onClick={() => setMobileFiltersOpen(false)}
              className="mt-6 w-full min-h-[44px] rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 cursor-pointer"
            >
              Show {filteredMatches.length} results
            </button>
          </div>
        </div>
      )}

      {/* How Matching Works Modal */}
      {howItWorksOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/45 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="how-matching-title"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between gap-4 mb-3">
              <h2 id="how-matching-title" className="font-display text-lg font-bold text-indigo-950">
                How Roomie matching works
              </h2>
              <button
                type="button"
                onClick={() => setHowItWorksOpen(false)}
                className="w-9 h-9 inline-flex items-center justify-center rounded-xl text-stone-500 hover:bg-stone-100 cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-sm text-stone-600 leading-relaxed">
              <p>
                <strong className="text-indigo-950">1. Deal-breaker check:</strong> Students who
                violate any of your deal-breakers, have a conflicting roommate gender preference, or
                have a non-overlapping rent budget are automatically excluded.
              </p>
              <p>
                <strong className="text-indigo-950">2. Weighted lifestyle fit:</strong> Every
                lifestyle trait (like sleep schedule, cleanliness, and noise) is compared and
                multiplied by the 1–5 importance weight you chose.
              </p>
              <p>
                <strong className="text-indigo-950">3. Mutual compatibility:</strong> Your final
                percentage averages how well they fit your preferences and how well you fit theirs.
              </p>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setHowItWorksOpen(false)}
                className="px-4 py-2 min-h-[40px] rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

function MatchProfileCard({
  profile,
  result,
}: {
  profile: RoommateProfile;
  result: MatchComparisonResult;
}) {
  const sharedTraits = result.breakdown
    .filter((item) => item.status === 'match')
    .slice(0, 3);

  return (
    <Link
      to={`/dashboard/profile/${profile.userId}`}
      className="group bg-white rounded-2xl p-6 shadow-[0_2px_16px_-4px_rgba(26,25,43,0.07)] hover:shadow-[0_10px_28px_-8px_rgba(79,70,229,0.16)] transition-all flex flex-col justify-between gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
    >
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3.5 min-w-0">
            <Avatar name={profile.basics.name} avatar={profile.basics.avatar} size="md" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-display text-base font-bold text-indigo-950 group-hover:text-indigo-700 transition-colors truncate">
                  {profile.basics.name}, {profile.basics.age}
                </h2>
                {profile.isDemo && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[11px] font-semibold">
                    Demo
                  </span>
                )}
              </div>
              <p className="text-xs font-medium text-stone-600 truncate mt-0.5">
                {profile.basics.college}
              </p>
              <p className="text-xs text-stone-500 truncate mt-0.5">
                {profile.housing.preferredCity} · {profile.housing.preferredArea}
              </p>
            </div>
          </div>

          <CompatibilityRing score={result.score} size="sm" />
        </div>

        <p className="text-sm font-semibold text-stone-800 tabular-nums">
          {formatINR(profile.housing.budgetMin)} – {formatINR(profile.housing.budgetMax)} / mo
        </p>

        {sharedTraits.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {sharedTraits.map((item) => (
              <span
                key={item.key}
                className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[#f8f7f4] text-stone-700 text-xs font-medium"
              >
                {item.trait}: {item.theirAnswer}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-semibold text-indigo-700">
        <span>View lifestyle breakdown</span>
        <span aria-hidden="true">→</span>
      </div>
    </Link>
  );
}
