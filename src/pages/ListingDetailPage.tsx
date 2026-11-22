import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  BedDouble,
  Building2,
  Calendar,
  CheckCircle2,
  Flag,
  Loader2,
  MapPin,
  MessageSquare,
  Phone,
  Send,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { DashboardNavbar } from '../components/DashboardNavbar';
import { Footer } from '../components/Footer';
import { BlockUserModal, ReportUserModal } from '../components/SafetyModals';
import { useAuth } from '../services/AuthContext';
import { getListingById } from '../services/listingService';
import { getOwnerPublicProfile } from '../services/ownerProfileService';
import { getProfile } from '../services/profileService';
import {
  sendConnectRequest,
  subscribeToUserRequests,
  updateRequestStatus,
} from '../services/requestService';
import { getBlockedUserIdSet, subscribeToBlocks } from '../services/safetyService';
import { useToast } from '../services/ToastContext';
import type {
  ConnectRequest,
  Listing,
  OwnerPublicProfile,
  RoommateProfile,
} from '../services/types';
import {
  evaluateListingCompatibility,
  formatAmenity,
  formatFurnished,
  formatGenderAllowed,
  formatPropertyType,
} from '../utils/listingCompatibility';

function formatInr(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function ListingDetailPage() {
  const { listingId = '' } = useParams<{ listingId: string }>();
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [listing, setListing] = useState<Listing | null>(null);
  const [ownerPublic, setOwnerPublic] = useState<OwnerPublicProfile | null>(null);
  const [myProfile, setMyProfile] = useState<RoommateProfile | null>(null);
  const [requests, setRequests] = useState<ConnectRequest[]>([]);
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [enquiryMessage, setEnquiryMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const [reportMode, setReportMode] = useState<'listing' | 'owner' | null>(null);
  const [blockOpen, setBlockOpen] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    const unsubReqs = subscribeToUserRequests(user.uid, setRequests);
    const unsubBlocks = subscribeToBlocks(user.uid, (blocks) => {
      setBlockedIds(getBlockedUserIdSet(user.uid, blocks));
    });
    return () => {
      unsubReqs();
      unsubBlocks();
    };
  }, [user?.uid]);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!user?.uid || !listingId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const [foundListing, profile] = await Promise.all([
          getListingById(listingId),
          getProfile(user.uid),
        ]);
        if (!active) return;
        setListing(foundListing);
        setMyProfile(profile);
        setActivePhotoIndex(0);

        if (foundListing) {
          const ownerPub = await getOwnerPublicProfile(foundListing.ownerId);
          if (active) setOwnerPublic(ownerPub);
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

  const existingEnquiry = useMemo(() => {
    if (!user?.uid || !listing) return null;
    return (
      requests.find(
        (r) =>
          r.listingId === listing.id &&
          r.fromUserId === user.uid &&
          r.toUserId === listing.ownerId &&
          (r.status === 'pending' || r.status === 'accepted'),
      ) || null
    );
  }, [requests, user?.uid, listing]);

  const compatibility = useMemo(
    () => (listing ? evaluateListingCompatibility(myProfile, listing) : null),
    [myProfile, listing],
  );

  const isOwnerBlocked = listing ? blockedIds.has(listing.ownerId) : false;

  const handleSendEnquiry = async (event: FormEvent) => {
    event.preventDefault();
    if (!user?.uid || !listing || sending) return;

    setSending(true);
    try {
      await sendConnectRequest(user.uid, listing.ownerId, enquiryMessage, {
        listingId: listing.id,
        listingTitle: listing.title,
        onDemoAccepted: (ownerName) => {
          showToast(`${ownerName} accepted your enquiry! Chat & contact info are now unlocked.`, 'success');
        },
      });
      setEnquiryMessage('');
      showToast(
        listing.isDemo
          ? 'Enquiry sent! This demo owner will respond in ~5 seconds.'
          : 'Enquiry sent to the property owner!',
        'success',
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not send enquiry.', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleCancelEnquiry = async () => {
    if (!user?.uid || !existingEnquiry || cancelling) return;
    setCancelling(true);
    try {
      await updateRequestStatus(existingEnquiry, user.uid, 'cancelled');
      showToast('Enquiry cancelled.', 'info');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to cancel enquiry.', 'error');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f7f4] dark:bg-slate-950 text-stone-900 dark:text-slate-100 flex flex-col">
      <DashboardNavbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <Link
          to="/dashboard/rooms"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 dark:text-slate-300 hover:text-indigo-700 dark:hover:text-indigo-400 mb-5"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Back to Rooms &amp; PGs</span>
        </Link>

        {/* Safety Banner */}
        <div className="mb-6 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/70 px-4 py-3 flex items-center gap-2.5 text-xs sm:text-sm text-amber-950 dark:text-amber-200">
          <ShieldAlert className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" aria-hidden="true" />
          <span>Visit the property in person before paying any deposit or advance.</span>
        </div>

        {loading ? (
          <div className="bg-white dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-2xl p-10 flex items-center justify-center gap-3 text-sm text-stone-600 dark:text-slate-300">
            <Loader2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-spin" aria-hidden="true" />
            <span>Loading listing details...</span>
          </div>
        ) : !listing || isOwnerBlocked ? (
          <div className="bg-white dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-2xl p-8 text-center">
            <h1 className="font-display text-xl font-bold text-indigo-950 dark:text-slate-100 mb-2">
              {isOwnerBlocked ? 'Listing hidden (owner blocked)' : 'Listing not found'}
            </h1>
            <p className="text-sm text-stone-600 dark:text-slate-300 mb-5">
              {isOwnerBlocked
                ? 'You have blocked this owner. Manage blocked accounts anytime in My Profile.'
                : 'This listing may have been removed or marked as rented.'}
            </p>
            <Link
              to="/dashboard/rooms"
              className="inline-flex items-center justify-center px-5 py-2.5 min-h-[44px] rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
            >
              Browse other rooms
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Main Column */}
            <div className="lg:col-span-8 space-y-6">
              {/* Photo Gallery & Key Specs */}
              <section className="bg-white dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-2xl overflow-hidden shadow-[0_2px_18px_-4px_rgba(26,25,43,0.07)] dark:shadow-none">
                <div className="relative h-64 sm:h-80 bg-indigo-50 dark:bg-slate-800">
                  {listing.photoUrls.length > 0 ? (
                    <img
                      src={listing.photoUrls[activePhotoIndex] || listing.photoUrls[0]}
                      alt={listing.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-indigo-400 dark:text-slate-500">
                      <Building2 className="w-12 h-12 mb-2" aria-hidden="true" />
                      <span className="text-xs font-medium">No photos provided</span>
                    </div>
                  )}
                  {listing.isDemo && (
                    <span className="absolute top-4 left-4 px-2.5 py-1 rounded-lg bg-stone-900/80 text-white text-xs font-semibold">
                      Demo
                    </span>
                  )}
                </div>

                {listing.photoUrls.length > 1 && (
                  <div className="p-3 border-b border-stone-100 dark:border-slate-800 flex gap-2 overflow-x-auto">
                    {listing.photoUrls.map((url, idx) => (
                      <button
                        key={url}
                        type="button"
                        onClick={() => setActivePhotoIndex(idx)}
                        className={`w-16 h-12 rounded-lg overflow-hidden border-2 shrink-0 cursor-pointer ${
                          idx === activePhotoIndex
                            ? 'border-indigo-600'
                            : 'border-transparent opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={url}
                          alt={`Thumbnail ${idx + 1}`}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}

                <div className="p-6 sm:p-8 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="px-2.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 text-xs font-semibold">
                          {formatPropertyType(listing.propertyType)}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-md bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-slate-300 text-xs font-semibold">
                          {formatGenderAllowed(listing.genderAllowed)}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-md bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-slate-300 text-xs font-semibold">
                          {formatFurnished(listing.furnished)}
                        </span>
                      </div>
                      <h1 className="font-display text-2xl font-bold text-indigo-950 dark:text-slate-100">
                        {listing.title}
                      </h1>
                      <p className="text-sm text-stone-600 dark:text-slate-300 flex items-center gap-1.5 mt-1.5">
                        <MapPin className="w-4 h-4 text-stone-400 shrink-0" aria-hidden="true" />
                        <span>
                          {listing.address.street}, {listing.address.area}, {listing.address.city}
                          {listing.address.pincode ? ` - ${listing.address.pincode}` : ''}
                        </span>
                      </p>
                      {listing.nearbyLandmark && (
                        <p className="text-xs text-indigo-700 dark:text-indigo-400 font-medium mt-1">
                          Near: {listing.nearbyLandmark}
                        </p>
                      )}
                    </div>

                    <div className="sm:text-right shrink-0">
                      <p className="font-display text-2xl font-bold text-indigo-700 dark:text-indigo-400 tabular-nums">
                        {formatInr(listing.rentPerMonth)}
                        <span className="text-xs font-medium text-stone-500 dark:text-slate-400">/mo</span>
                      </p>
                      <p className="text-xs text-stone-500 dark:text-slate-400 tabular-nums mt-0.5">
                        Deposit: {formatInr(listing.securityDeposit)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-stone-100 dark:border-slate-800 text-sm">
                    <div className="rounded-xl bg-[#f8f7f4] dark:bg-slate-800/70 p-3">
                      <p className="text-xs text-stone-500 dark:text-slate-400">Availability</p>
                      <p className="font-semibold text-indigo-950 dark:text-slate-100 inline-flex items-center gap-1.5 mt-0.5 tabular-nums">
                        <BedDouble className="w-4 h-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                        {listing.availableBeds} of {listing.totalBeds} beds open
                      </p>
                    </div>
                    <div className="rounded-xl bg-[#f8f7f4] dark:bg-slate-800/70 p-3">
                      <p className="text-xs text-stone-500 dark:text-slate-400">Available from</p>
                      <p className="font-semibold text-indigo-950 dark:text-slate-100 inline-flex items-center gap-1.5 mt-0.5 tabular-nums">
                        <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                        {listing.availableFrom}
                      </p>
                    </div>
                    <div className="rounded-xl bg-[#f8f7f4] dark:bg-slate-800/70 p-3 col-span-2 sm:col-span-1">
                      <p className="text-xs text-stone-500 dark:text-slate-400">Entry curfew</p>
                      <p className="font-semibold text-indigo-950 dark:text-slate-100 mt-0.5">
                        {listing.houseRules.curfewTime || 'No curfew'}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h2 className="font-display text-base font-bold text-indigo-950 dark:text-slate-100 mb-2">
                      About this space
                    </h2>
                    <p className="text-sm text-stone-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                      {listing.description}
                    </p>
                  </div>

                  {listing.amenities.length > 0 && (
                    <div>
                      <h2 className="font-display text-base font-bold text-indigo-950 dark:text-slate-100 mb-2.5">
                        Amenities
                      </h2>
                      <div className="flex flex-wrap gap-2">
                        {listing.amenities.map((a) => (
                          <span
                            key={a}
                            className="px-3 py-1.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900 text-xs font-semibold text-indigo-900 dark:text-indigo-200"
                          >
                            {formatAmenity(a)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* House Rules vs Lifestyle Comparison */}
              {compatibility && compatibility.items.length > 0 && (
                <section className="bg-white dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-[0_2px_18px_-4px_rgba(26,25,43,0.07)] dark:shadow-none">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                    <div>
                      <h2 className="font-display text-lg font-bold text-indigo-950 dark:text-slate-100">
                        House rules vs. your lifestyle
                      </h2>
                      <p className="text-xs text-stone-500 dark:text-slate-400 mt-0.5">
                        Compared against your saved Roomie student profile.
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-lg text-xs font-bold ${
                        compatibility.tone === 'emerald'
                          ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300'
                          : compatibility.tone === 'amber'
                            ? 'bg-amber-50 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300'
                            : 'bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300'
                      }`}
                    >
                      {compatibility.badgeLabel}
                    </span>
                  </div>

                  <div className="divide-y divide-stone-100 dark:divide-slate-800">
                    {compatibility.items.map((item) => (
                      <div key={item.key} className="py-3 flex items-start justify-between gap-4">
                        <div className="flex items-start gap-2.5">
                          {item.status === 'match' ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
                          ) : item.status === 'warning' ? (
                            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
                          )}
                          <div>
                            <p className="text-sm font-semibold text-indigo-950 dark:text-slate-100">
                              {item.label}: <span className="font-normal">{item.listingRule}</span>
                            </p>
                            <p className="text-xs text-stone-600 dark:text-slate-300 mt-0.5">
                              {item.detail}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs font-medium text-stone-500 dark:text-slate-400 shrink-0">
                          You: {item.studentHabit}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Sidebar: Owner Card, Enquiry & Safety */}
            <aside className="lg:col-span-4 space-y-5">
              {/* Public Owner Card (NEVER shows email or phone publicly) */}
              <section className="bg-white dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-2xl p-6 shadow-[0_2px_18px_-4px_rgba(26,25,43,0.07)] dark:shadow-none space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar
                    name={ownerPublic?.name || listing.ownerName}
                    avatar={ownerPublic?.avatar}
                    size="md"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
                      Property Owner
                    </p>
                    <h2 className="font-display text-base font-bold text-indigo-950 dark:text-slate-100 truncate">
                      {ownerPublic?.name || listing.ownerName}
                    </h2>
                    <p className="text-xs text-stone-500 dark:text-slate-400">
                      {ownerPublic?.city || listing.address.city}
                    </p>
                  </div>
                </div>

                {ownerPublic?.bio && (
                  <p className="text-xs sm:text-sm text-stone-600 dark:text-slate-300 leading-relaxed">
                    {ownerPublic.bio}
                  </p>
                )}

                {existingEnquiry?.status === 'accepted' ? (
                  <div className="space-y-3 pt-2 border-t border-stone-100 dark:border-slate-800">
                    <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 p-3.5">
                      <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                        Enquiry accepted!
                      </p>
                      <p className="text-xs text-emerald-700 dark:text-emerald-200 mt-0.5">
                        You can now chat directly with {ownerPublic?.name || listing.ownerName}.
                      </p>
                      {existingEnquiry.ownerPhone && (
                        <p className="mt-2.5 pt-2 border-t border-emerald-200/80 dark:border-emerald-800/80 text-xs font-semibold text-emerald-900 dark:text-emerald-100 inline-flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Owner phone: {existingEnquiry.ownerPhone}</span>
                        </p>
                      )}
                    </div>

                    <Link
                      to="/dashboard/chat"
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
                    >
                      <MessageSquare className="w-4 h-4" aria-hidden="true" />
                      <span>Open chat</span>
                    </Link>
                  </div>
                ) : existingEnquiry?.status === 'pending' ? (
                  <div className="space-y-3 pt-2 border-t border-stone-100 dark:border-slate-800">
                    <div className="rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 p-3.5 text-xs text-indigo-900 dark:text-indigo-200">
                      Enquiry sent! Waiting for the owner to accept. Phone contact is unlocked once
                      accepted.
                    </div>
                    <button
                      type="button"
                      onClick={handleCancelEnquiry}
                      disabled={cancelling}
                      className="w-full px-4 py-2.5 min-h-[42px] rounded-xl border border-stone-200 dark:border-slate-700 text-xs font-semibold text-stone-700 dark:text-slate-200 hover:bg-stone-50 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      {cancelling ? 'Cancelling...' : 'Cancel enquiry'}
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSendEnquiry} className="space-y-3 pt-2 border-t border-stone-100 dark:border-slate-800">
                    <label htmlFor="enquiry-msg" className="block text-xs font-semibold text-stone-700 dark:text-slate-200">
                      Send enquiry (optional note)
                    </label>
                    <textarea
                      id="enquiry-msg"
                      rows={3}
                      maxLength={300}
                      value={enquiryMessage}
                      onChange={(e) => setEnquiryMessage(e.target.value)}
                      placeholder="Hi! I'm interested in visiting this property and moving in soon."
                      className="w-full rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
                    />
                    <button
                      type="submit"
                      disabled={sending}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors cursor-pointer disabled:opacity-70"
                    >
                      {sending ? (
                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <Send className="w-4 h-4" aria-hidden="true" />
                      )}
                      <span>{sending ? 'Sending enquiry...' : 'Send enquiry'}</span>
                    </button>
                    <p className="text-[11px] text-stone-500 dark:text-slate-400">
                      Owner email &amp; phone remain private until your enquiry is accepted.
                    </p>
                  </form>
                )}
              </section>

              {/* Report / Block Safety Actions */}
              <section className="bg-white dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-2xl p-5 shadow-[0_2px_18px_-4px_rgba(26,25,43,0.07)] dark:shadow-none space-y-2.5">
                <p className="text-xs font-semibold text-stone-500 dark:text-slate-400 uppercase tracking-wider">
                  Safety controls
                </p>
                <button
                  type="button"
                  onClick={() => setReportMode('listing')}
                  className="w-full flex items-center gap-2 px-3.5 py-2.5 min-h-[42px] rounded-xl border border-stone-200 dark:border-slate-700 text-xs font-semibold text-stone-700 dark:text-slate-200 hover:bg-stone-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <Flag className="w-4 h-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                  <span>Report listing</span>
                </button>
                <button
                  type="button"
                  onClick={() => setReportMode('owner')}
                  className="w-full flex items-center gap-2 px-3.5 py-2.5 min-h-[42px] rounded-xl border border-stone-200 dark:border-slate-700 text-xs font-semibold text-stone-700 dark:text-slate-200 hover:bg-stone-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <Flag className="w-4 h-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                  <span>Report owner</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBlockOpen(true)}
                  className="w-full flex items-center gap-2 px-3.5 py-2.5 min-h-[42px] rounded-xl border border-rose-200 dark:border-rose-900 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                >
                  <Ban className="w-4 h-4" aria-hidden="true" />
                  <span>Block owner</span>
                </button>
              </section>
            </aside>
          </div>
        )}
      </main>

      {user?.uid && listing && (
        <>
          <ReportUserModal
            open={reportMode !== null}
            onClose={() => setReportMode(null)}
            byUserId={user.uid}
            targetUserId={listing.ownerId}
            targetName={
              reportMode === 'listing'
                ? listing.title
                : ownerPublic?.name || listing.ownerName
            }
            listingId={reportMode === 'listing' ? listing.id : undefined}
            targetType={reportMode === 'listing' ? 'listing' : 'owner'}
          />
          <BlockUserModal
            open={blockOpen}
            onClose={() => setBlockOpen(false)}
            byUserId={user.uid}
            targetUserId={listing.ownerId}
            targetName={ownerPublic?.name || listing.ownerName}
            isOwnerTarget
            onBlocked={() => navigate('/dashboard/rooms')}
          />
        </>
      )}

      <Footer />
    </div>
  );
}
