import {
  AlertTriangle,
  BedDouble,
  Building2,
  CheckCircle2,
  Edit3,
  Loader2,
  MapPin,
  PauseCircle,
  PlayCircle,
  Plus,
  Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Footer } from '../components/Footer';
import { OwnerNavbar } from '../components/OwnerNavbar';
import { useAuth } from '../services/AuthContext';
import {
  deleteListing,
  getOwnerListings,
  updateListingStatus,
} from '../services/listingService';
import { useToast } from '../services/ToastContext';
import type { Listing, ListingStatus } from '../services/types';
import { formatGenderAllowed, formatPropertyType, LISTING_STATUS_LABELS } from '../utils/listingCompatibility';

function formatInr(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function OwnerListingsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Listing | null>(null);

  const loadListings = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const data = await getOwnerListings(user.uid);
      setListings(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadListings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const handleStatusChange = async (listing: Listing, nextStatus: ListingStatus) => {
    if (!user?.uid || actingId) return;
    setActingId(listing.id);
    try {
      const updated = await updateListingStatus(listing, user.uid, nextStatus);
      setListings((prev) => prev.map((l) => (l.id === listing.id ? updated : l)));
      showToast(`Listing marked as ${LISTING_STATUS_LABELS[nextStatus].toLowerCase()}.`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to update listing status.', 'error');
    } finally {
      setActingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!user?.uid || !deleteTarget || actingId) return;
    setActingId(deleteTarget.id);
    try {
      await deleteListing(deleteTarget.id, user.uid);
      setListings((prev) => prev.filter((l) => l.id !== deleteTarget.id));
      showToast('Listing deleted.', 'info');
      setDeleteTarget(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to delete listing.', 'error');
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f7f4] dark:bg-slate-950 text-stone-900 dark:text-slate-100 flex flex-col">
      <OwnerNavbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-7">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-indigo-950 dark:text-slate-100 tracking-tight">
              Welcome, {user?.name || 'Owner'}
            </h1>
            <p className="text-sm text-stone-600 dark:text-slate-300 mt-1">
              Manage your rooms, PGs, and student enquiries from one place.
            </p>
          </div>

          <Link
            to="/owner/listings/new"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Add Listing</span>
          </Link>
        </div>

        {loading ? (
          <div className="bg-white dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-2xl p-10 flex items-center justify-center gap-3 text-sm text-stone-600 dark:text-slate-300">
            <Loader2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-spin" aria-hidden="true" />
            <span>Loading your listings...</span>
          </div>
        ) : listings.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-2xl p-8 sm:p-12 text-center shadow-[0_2px_16px_-4px_rgba(26,25,43,0.07)] dark:shadow-none">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 mb-4">
              <Building2 className="w-6 h-6" aria-hidden="true" />
            </div>
            <h2 className="font-display text-lg font-bold text-indigo-950 dark:text-slate-100 mb-1.5">
              No listings published yet
            </h2>
            <p className="text-sm text-stone-600 dark:text-slate-300 max-w-md mx-auto mb-6">
              Add your first room, PG, or flat so nearby college students can discover your
              property and send verified enquiries.
            </p>
            <Link
              to="/owner/listings/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>Create your first listing</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing) => {
              const photo = listing.photoUrls[0];
              const isBusy = actingId === listing.id;
              return (
                <article
                  key={listing.id}
                  className="bg-white dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-2xl overflow-hidden shadow-[0_2px_16px_-4px_rgba(26,25,43,0.07)] dark:shadow-none flex flex-col"
                >
                  <div className="relative h-44 bg-indigo-50 dark:bg-slate-800">
                    {photo ? (
                      <img
                        src={photo}
                        alt={listing.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-indigo-400 dark:text-slate-500">
                        <Building2 className="w-10 h-10" aria-hidden="true" />
                      </div>
                    )}
                    <span
                      className={`absolute top-3 right-3 px-2.5 py-1 rounded-lg text-xs font-bold shadow-xs ${
                        listing.status === 'active'
                          ? 'bg-emerald-600 text-white'
                          : listing.status === 'paused'
                            ? 'bg-amber-500 text-white'
                            : 'bg-stone-700 text-white'
                      }`}
                    >
                      {LISTING_STATUS_LABELS[listing.status]}
                    </span>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h2 className="font-display text-base font-bold text-indigo-950 dark:text-slate-100 leading-snug">
                          {listing.title}
                        </h2>
                        <span className="text-sm font-bold text-indigo-700 dark:text-indigo-400 whitespace-nowrap tabular-nums">
                          {formatInr(listing.rentPerMonth)}/mo
                        </span>
                      </div>

                      <p className="text-xs text-stone-600 dark:text-slate-300 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" aria-hidden="true" />
                        <span className="truncate">
                          {listing.address.area}, {listing.address.city}
                        </span>
                      </p>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500 dark:text-slate-400">
                        <span>{formatPropertyType(listing.propertyType)}</span>
                        <span>·</span>
                        <span>{formatGenderAllowed(listing.genderAllowed)}</span>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1 tabular-nums">
                          <BedDouble className="w-3.5 h-3.5" aria-hidden="true" />
                          {listing.availableBeds}/{listing.totalBeds} beds open
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-stone-100 dark:border-slate-800 grid grid-cols-2 gap-2">
                      <Link
                        to={`/owner/listings/${listing.id}/edit`}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-stone-700 dark:text-slate-200 hover:bg-stone-50 dark:hover:bg-slate-700"
                      >
                        <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Edit</span>
                      </Link>

                      {listing.status === 'active' ? (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(listing, 'paused')}
                          disabled={isBusy}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer disabled:opacity-50"
                        >
                          <PauseCircle className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Pause</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(listing, 'active')}
                          disabled={isBusy}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer disabled:opacity-50"
                        >
                          <PlayCircle className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Activate</span>
                        </button>
                      )}

                      {listing.status !== 'rented' && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(listing, 'rented')}
                          disabled={isBusy}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-stone-700 dark:text-slate-200 hover:bg-stone-50 dark:hover:bg-slate-700 cursor-pointer disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Mark rented</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setDeleteTarget(listing)}
                        disabled={isBusy}
                        className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/70 dark:bg-rose-950/40 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/70 cursor-pointer disabled:opacity-50 ${
                          listing.status === 'rented' ? 'col-span-2' : ''
                        }`}
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/45 dark:bg-black/70 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-listing-title"
        >
          <div className="bg-white dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-start gap-3 mb-4">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 shrink-0">
                <AlertTriangle className="w-5 h-5" aria-hidden="true" />
              </span>
              <div>
                <h2 id="delete-listing-title" className="font-display text-lg font-bold text-indigo-950 dark:text-slate-100">
                  Delete listing?
                </h2>
                <p className="text-sm text-stone-600 dark:text-slate-300 mt-1 leading-relaxed">
                  Are you sure you want to permanently remove <strong>{deleteTarget.title}</strong>?
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={Boolean(actingId)}
                className="px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold text-stone-700 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={Boolean(actingId)}
                className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 disabled:opacity-70 cursor-pointer"
              >
                {actingId === deleteTarget.id && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                <span>Delete listing</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
