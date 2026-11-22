import {
  BedDouble,
  Building2,
  CheckCircle2,
  Filter,
  Loader2,
  MapPin,
  Search,
  ShieldAlert,
  Sparkles,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardNavbar } from '../components/DashboardNavbar';
import { Footer } from '../components/Footer';
import { useAuth } from '../services/AuthContext';
import { getActiveListings } from '../services/listingService';
import { getProfile } from '../services/profileService';
import { getBlockedUserIdSet, subscribeToBlocks } from '../services/safetyService';
import type {
  Listing,
  ListingAmenity,
  ListingGenderAllowed,
  PropertyType,
  RoommateProfile,
} from '../services/types';
import {
  AMENITY_OPTIONS,
  evaluateListingCompatibility,
  formatAmenity,
  formatGenderAllowed,
  formatPropertyType,
  PROPERTY_TYPE_OPTIONS,
} from '../utils/listingCompatibility';

function formatInr(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function RoomsPage() {
  const { user } = useAuth();

  const [listings, setListings] = useState<Listing[]>([]);
  const [myProfile, setMyProfile] = useState<RoommateProfile | null>(null);
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const [searchText, setSearchText] = useState('');
  const [cityFilter, setCityFilter] = useState('all');
  const [maxRent, setMaxRent] = useState(40000);
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<'all' | PropertyType>('all');
  const [genderFilter, setGenderFilter] = useState<'all' | ListingGenderAllowed>('all');
  const [availableByDate, setAvailableByDate] = useState('');
  const [selectedAmenities, setSelectedAmenities] = useState<ListingAmenity[]>([]);
  const [onlyMatchesLifestyle, setOnlyMatchesLifestyle] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

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
      try {
        const [activeListings, profile] = await Promise.all([
          getActiveListings(),
          getProfile(user.uid),
        ]);
        if (active) {
          setListings(activeListings);
          setMyProfile(profile);
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

  const availableCities = useMemo(() => {
    const set = new Set<string>();
    listings.forEach((l) => {
      if (l.address.city.trim()) set.add(l.address.city.trim());
    });
    return Array.from(set).sort();
  }, [listings]);

  const filteredListings = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return listings
      .filter((listing) => {
        if (blockedIds.has(listing.ownerId)) return false;
        if (listing.rentPerMonth > maxRent) return false;
        if (
          cityFilter !== 'all' &&
          listing.address.city.trim().toLowerCase() !== cityFilter.toLowerCase()
        ) {
          return false;
        }
        if (propertyTypeFilter !== 'all' && listing.propertyType !== propertyTypeFilter) {
          return false;
        }
        if (genderFilter !== 'all' && listing.genderAllowed !== genderFilter) {
          return false;
        }
        if (availableByDate && listing.availableFrom && listing.availableFrom > availableByDate) {
          return false;
        }
        if (
          selectedAmenities.length > 0 &&
          !selectedAmenities.every((a) => listing.amenities.includes(a))
        ) {
          return false;
        }
        if (q) {
          const hay = `${listing.title} ${listing.address.area} ${listing.address.city} ${listing.nearbyLandmark} ${listing.description}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        if (onlyMatchesLifestyle) {
          const compat = evaluateListingCompatibility(myProfile, listing);
          if (!compat.compatible) return false;
        }
        return true;
      })
      .map((listing) => ({
        listing,
        compatibility: evaluateListingCompatibility(myProfile, listing),
      }));
  }, [
    listings,
    blockedIds,
    maxRent,
    cityFilter,
    propertyTypeFilter,
    genderFilter,
    availableByDate,
    selectedAmenities,
    searchText,
    onlyMatchesLifestyle,
    myProfile,
  ]);

  const toggleAmenityFilter = (amenity: ListingAmenity) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity],
    );
  };

  const resetFilters = () => {
    setSearchText('');
    setCityFilter('all');
    setMaxRent(40000);
    setPropertyTypeFilter('all');
    setGenderFilter('all');
    setAvailableByDate('');
    setSelectedAmenities([]);
    setOnlyMatchesLifestyle(false);
  };

  return (
    <div className="min-h-screen bg-[#f8f7f4] dark:bg-slate-950 text-stone-900 dark:text-slate-100 flex flex-col">
      <DashboardNavbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-indigo-950 dark:text-slate-100 tracking-tight">
              Rooms &amp; PGs near campus
            </h1>
            <p className="text-sm text-stone-600 dark:text-slate-300 mt-1">
              Browse verified owner listings and see how each home&apos;s house rules fit your lifestyle.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setFiltersOpen((prev) => !prev)}
            className="lg:hidden inline-flex items-center gap-2 px-4 py-2.5 min-h-[42px] rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-stone-700 dark:text-slate-200 self-start cursor-pointer"
          >
            <Filter className="w-4 h-4" aria-hidden="true" />
            <span>{filtersOpen ? 'Hide filters' : 'Filter rooms'}</span>
          </button>
        </div>

        {/* Safety Banner */}
        <div className="mb-6 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/70 px-4 py-3 flex items-center gap-2.5 text-xs sm:text-sm text-amber-950 dark:text-amber-200">
          <ShieldAlert className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" aria-hidden="true" />
          <span>Visit the property in person before paying any deposit or advance.</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Filters Sidebar */}
          <aside
            className={`lg:col-span-4 bg-white dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-2xl p-5 shadow-[0_2px_16px_-4px_rgba(26,25,43,0.07)] dark:shadow-none space-y-5 ${
              filtersOpen ? 'block' : 'hidden lg:block'
            }`}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-indigo-950 dark:text-slate-100">
                Filters
              </h2>
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                Reset all
              </button>
            </div>

            <div>
              <label htmlFor="rooms-search" className="block text-xs font-semibold text-stone-600 dark:text-slate-300 mb-1.5">
                Search area or college
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                <input
                  id="rooms-search"
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Kothrud, IIT Indore, Kota..."
                  className="w-full min-h-[42px] rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 pl-9 pr-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="rooms-city" className="block text-xs font-semibold text-stone-600 dark:text-slate-300 mb-1.5">
                  City
                </label>
                <select
                  id="rooms-city"
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                  className="w-full min-h-[42px] rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
                >
                  <option value="all">All cities</option>
                  {availableCities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="rooms-type" className="block text-xs font-semibold text-stone-600 dark:text-slate-300 mb-1.5">
                  Property type
                </label>
                <select
                  id="rooms-type"
                  value={propertyTypeFilter}
                  onChange={(e) => setPropertyTypeFilter(e.target.value as 'all' | PropertyType)}
                  className="w-full min-h-[42px] rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
                >
                  <option value="all">Any type</option>
                  {PROPERTY_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="rooms-rent" className="text-xs font-semibold text-stone-600 dark:text-slate-300">
                  Max monthly rent
                </label>
                <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400 tabular-nums">
                  {formatInr(maxRent)}/mo
                </span>
              </div>
              <input
                id="rooms-rent"
                type="range"
                min={2000}
                max={40000}
                step={500}
                value={maxRent}
                onChange={(e) => setMaxRent(Number(e.target.value))}
                className="w-full accent-indigo-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="rooms-gender" className="block text-xs font-semibold text-stone-600 dark:text-slate-300 mb-1.5">
                  Gender allowed
                </label>
                <select
                  id="rooms-gender"
                  value={genderFilter}
                  onChange={(e) => setGenderFilter(e.target.value as 'all' | ListingGenderAllowed)}
                  className="w-full min-h-[42px] rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
                >
                  <option value="all">Any</option>
                  <option value="boys">Boys</option>
                  <option value="girls">Girls</option>
                  <option value="any">Co-living / Any</option>
                </select>
              </div>

              <div>
                <label htmlFor="rooms-available-by" className="block text-xs font-semibold text-stone-600 dark:text-slate-300 mb-1.5">
                  Move-in by
                </label>
                <input
                  id="rooms-available-by"
                  type="date"
                  value={availableByDate}
                  onChange={(e) => setAvailableByDate(e.target.value)}
                  className="w-full min-h-[42px] rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-2 text-xs sm:text-sm"
                />
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-stone-600 dark:text-slate-300 mb-2">
                Amenities
              </p>
              <div className="flex flex-wrap gap-1.5">
                {AMENITY_OPTIONS.map((item) => {
                  const selected = selectedAmenities.includes(item.value);
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => toggleAmenityFilter(item.value)}
                      className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                        selected
                          ? 'border-indigo-600 bg-indigo-600 text-white'
                          : 'border-stone-200 dark:border-slate-700 text-stone-700 dark:text-slate-300 hover:bg-stone-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="flex items-center justify-between gap-3 pt-3 border-t border-stone-100 dark:border-slate-800 cursor-pointer">
              <div>
                <span className="text-sm font-semibold text-indigo-950 dark:text-slate-100 inline-flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                  Matches my lifestyle
                </span>
                <p className="text-[11px] text-stone-500 dark:text-slate-400">
                  Hide listings whose house rules conflict with your profile
                </p>
              </div>
              <input
                type="checkbox"
                checked={onlyMatchesLifestyle}
                onChange={(e) => setOnlyMatchesLifestyle(e.target.checked)}
                className="w-4 h-4 accent-indigo-600"
              />
            </label>
          </aside>

          {/* Listings Grid */}
          <section className="lg:col-span-8 space-y-4">
            {loading ? (
              <div className="bg-white dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-2xl p-10 flex items-center justify-center gap-3 text-sm text-stone-600 dark:text-slate-300">
                <Loader2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-spin" aria-hidden="true" />
                <span>Loading rooms and PGs...</span>
              </div>
            ) : filteredListings.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-2xl p-8 sm:p-12 text-center shadow-[0_2px_16px_-4px_rgba(26,25,43,0.07)] dark:shadow-none">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 mb-4">
                  <Building2 className="w-6 h-6" aria-hidden="true" />
                </div>
                <h2 className="font-display text-lg font-bold text-indigo-950 dark:text-slate-100 mb-1.5">
                  No rooms match these filters
                </h2>
                <p className="text-sm text-stone-600 dark:text-slate-300 max-w-md mx-auto mb-5">
                  Try increasing your budget slider, clearing amenity filters, or turning off the
                  strict lifestyle filter.
                </p>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[42px] rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 cursor-pointer"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                  <span>Reset filters</span>
                </button>
              </div>
            ) : (
              <>
                <p className="text-xs font-semibold text-stone-500 dark:text-slate-400 uppercase tracking-wider">
                  Showing {filteredListings.length} active {filteredListings.length === 1 ? 'listing' : 'listings'}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {filteredListings.map(({ listing, compatibility }) => {
                    const photo = listing.photoUrls[0];
                    const badgeColor =
                      compatibility.tone === 'emerald'
                        ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                        : compatibility.tone === 'amber'
                          ? 'bg-amber-50 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                          : 'bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800';

                    return (
                      <Link
                        key={listing.id}
                        to={`/dashboard/rooms/${listing.id}`}
                        className="group bg-white dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-2xl overflow-hidden shadow-[0_2px_16px_-4px_rgba(26,25,43,0.07)] dark:shadow-none hover:shadow-md transition-shadow flex flex-col"
                      >
                        <div className="relative h-44 bg-indigo-50 dark:bg-slate-800 overflow-hidden">
                          {photo ? (
                            <img
                              src={photo}
                              alt={listing.title}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-indigo-400 dark:text-slate-500">
                              <Building2 className="w-10 h-10" aria-hidden="true" />
                            </div>
                          )}
                          {listing.isDemo && (
                            <span className="absolute top-3 left-3 px-2 py-0.5 rounded-md bg-stone-900/75 text-white text-[11px] font-semibold">
                              Demo
                            </span>
                          )}
                          <span className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-white/95 dark:bg-slate-900/95 text-indigo-950 dark:text-slate-100 text-xs font-bold shadow-xs tabular-nums">
                            {formatInr(listing.rentPerMonth)}/mo
                          </span>
                        </div>

                        <div className="p-5 flex-1 flex flex-col justify-between gap-3">
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-display text-base font-bold text-indigo-950 dark:text-slate-100 group-hover:text-indigo-700 dark:group-hover:text-indigo-400 leading-snug">
                                {listing.title}
                              </h3>
                            </div>

                            <p className="text-xs text-stone-600 dark:text-slate-300 flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" aria-hidden="true" />
                              <span className="truncate">
                                {listing.address.area}, {listing.address.city}
                              </span>
                            </p>

                            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-stone-500 dark:text-slate-400">
                              <span>{formatPropertyType(listing.propertyType)}</span>
                              <span>·</span>
                              <span>{formatGenderAllowed(listing.genderAllowed)}</span>
                              <span>·</span>
                              <span className="inline-flex items-center gap-1 tabular-nums">
                                <BedDouble className="w-3.5 h-3.5" aria-hidden="true" />
                                {listing.availableBeds} beds open
                              </span>
                            </div>

                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {listing.amenities.slice(0, 3).map((a) => (
                                <span
                                  key={a}
                                  className="px-2 py-0.5 rounded-md bg-[#f8f7f4] dark:bg-slate-800 text-[11px] font-medium text-stone-700 dark:text-slate-300"
                                >
                                  {formatAmenity(a)}
                                </span>
                              ))}
                              {listing.amenities.length > 3 && (
                                <span className="px-2 py-0.5 rounded-md bg-[#f8f7f4] dark:bg-slate-800 text-[11px] font-medium text-stone-500 dark:text-slate-400">
                                  +{listing.amenities.length - 3} more
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="pt-3 border-t border-stone-100 dark:border-slate-800 flex items-center justify-between gap-2">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-semibold ${badgeColor}`}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                              <span>{compatibility.badgeLabel}</span>
                            </span>
                            <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-400">
                              View details →
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
