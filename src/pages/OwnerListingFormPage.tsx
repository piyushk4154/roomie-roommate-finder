import { ArrowLeft, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Footer } from '../components/Footer';
import { ListingFormWizard } from '../components/ListingFormWizard';
import { OwnerNavbar } from '../components/OwnerNavbar';
import { useAuth } from '../services/AuthContext';
import { getListingById } from '../services/listingService';
import type { Listing } from '../services/types';

export function OwnerListingFormPage() {
  const { listingId } = useParams<{ listingId?: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const isEdit = Boolean(listingId);
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(isEdit);
  const [notFoundError, setNotFoundError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      if (!listingId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setNotFoundError('');
      try {
        const found = await getListingById(listingId);
        if (!active) return;
        if (!found) {
          setNotFoundError('Listing not found.');
        } else if (user?.uid && found.ownerId !== user.uid) {
          setNotFoundError('You can only edit your own listings.');
        } else {
          setListing(found);
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [listingId, user?.uid]);

  return (
    <div className="min-h-screen bg-[#f8f7f4] dark:bg-slate-950 text-stone-900 dark:text-slate-100 flex flex-col">
      <OwnerNavbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="mb-6">
          <Link
            to="/owner"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 dark:text-slate-300 hover:text-indigo-700 dark:hover:text-indigo-400 mb-3"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Back to My Listings</span>
          </Link>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-indigo-950 dark:text-slate-100 tracking-tight">
            {isEdit ? 'Edit listing' : 'Add a new room or PG listing'}
          </h1>
          <p className="text-sm text-stone-600 dark:text-slate-300 mt-1">
            {isEdit
              ? 'Update property details, rent, availability, or house rules.'
              : 'Share accurate details so students can check compatibility before sending an enquiry.'}
          </p>
        </div>

        {loading ? (
          <div className="bg-white dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-2xl p-10 flex items-center justify-center gap-3 text-sm text-stone-600 dark:text-slate-300">
            <Loader2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-spin" aria-hidden="true" />
            <span>Loading listing...</span>
          </div>
        ) : notFoundError ? (
          <div className="bg-white dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-2xl p-8 text-center">
            <p className="text-sm text-rose-700 dark:text-rose-400 font-semibold mb-4">
              {notFoundError}
            </p>
            <Link
              to="/owner"
              className="inline-flex items-center justify-center px-5 py-2.5 min-h-[44px] rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
            >
              Return to My Listings
            </Link>
          </div>
        ) : (
          <ListingFormWizard
            mode={isEdit ? 'edit' : 'create'}
            initialListing={listing}
            onSaved={() => navigate('/owner')}
          />
        )}
      </main>

      <Footer />
    </div>
  );
}
