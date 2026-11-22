import { Building2, Check, Inbox, Loader2, MessageSquare, Phone, Send, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { CompatibilityRing } from '../components/CompatibilityRing';
import { DashboardNavbar } from '../components/DashboardNavbar';
import { Footer } from '../components/Footer';
import { OwnerNavbar } from '../components/OwnerNavbar';
import { useAuth } from '../services/AuthContext';
import { getAllOwnerPublicProfiles } from '../services/ownerProfileService';
import { getAllMatchableProfiles, getProfile } from '../services/profileService';
import { subscribeToUserRequests, updateRequestStatus } from '../services/requestService';
import { getBlockedUserIdSet, subscribeToBlocks } from '../services/safetyService';
import { useToast } from '../services/ToastContext';
import type {
  ConnectRequest,
  OwnerPublicProfile,
  RoommateProfile,
} from '../services/types';
import { compareProfiles, formatTraitAnswer } from '../utils/matching';

interface RequestsPageProps {
  portal?: 'student' | 'owner';
}

export function RequestsPage({ portal }: RequestsPageProps) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const resolvedPortal: 'student' | 'owner' =
    portal || (user?.role === 'owner' ? 'owner' : 'student');

  const [tab, setTab] = useState<'received' | 'sent'>('received');
  const [requests, setRequests] = useState<ConnectRequest[]>([]);
  const [profilesMap, setProfilesMap] = useState<Map<string, RoommateProfile>>(new Map());
  const [ownersMap, setOwnersMap] = useState<Map<string, OwnerPublicProfile>>(new Map());
  const [myProfile, setMyProfile] = useState<RoommateProfile | null>(null);
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) return;
    const unsubReqs = subscribeToUserRequests(user.uid, (reqs) => {
      setRequests(reqs);
    });
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
    async function loadProfiles() {
      if (!user?.uid) return;
      setLoading(true);
      try {
        const [mine, allStudents, allOwners] = await Promise.all([
          resolvedPortal === 'student' ? getProfile(user.uid) : Promise.resolve(null),
          getAllMatchableProfiles(),
          getAllOwnerPublicProfiles(),
        ]);
        if (active) {
          setMyProfile(mine);
          setProfilesMap(new Map(allStudents.map((p) => [p.userId, p])));
          setOwnersMap(new Map(allOwners.map((o) => [o.userId, o])));
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadProfiles();
    return () => {
      active = false;
    };
  }, [user?.uid, resolvedPortal]);

  const received = useMemo(() => {
    if (!user?.uid) return [];
    return requests.filter(
      (r) =>
        r.toUserId === user.uid &&
        r.status !== 'cancelled' &&
        !blockedIds.has(r.fromUserId),
    );
  }, [requests, user?.uid, blockedIds]);

  const sent = useMemo(() => {
    if (!user?.uid) return [];
    return requests.filter(
      (r) => r.fromUserId === user.uid && !blockedIds.has(r.toUserId),
    );
  }, [requests, user?.uid, blockedIds]);

  const handleAction = async (
    request: ConnectRequest,
    nextStatus: 'accepted' | 'declined' | 'cancelled',
  ) => {
    if (!user?.uid || actingId) return;
    setActingId(request.id);
    try {
      const ownerPhone =
        resolvedPortal === 'owner' && nextStatus === 'accepted' ? user.phone : undefined;
      await updateRequestStatus(request, user.uid, nextStatus, ownerPhone);
      showToast(
        nextStatus === 'accepted'
          ? 'Accepted! Chat is now open.'
          : nextStatus === 'declined'
            ? 'Request declined.'
            : 'Request cancelled.',
        nextStatus === 'accepted' ? 'success' : 'info',
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to update request.', 'error');
    } finally {
      setActingId(null);
    }
  };

  const activeList = resolvedPortal === 'owner' || tab === 'received' ? received : sent;

  return (
    <div className="min-h-screen bg-[#f8f7f4] dark:bg-slate-950 text-stone-900 dark:text-slate-100 flex flex-col">
      {resolvedPortal === 'owner' ? <OwnerNavbar /> : <DashboardNavbar />}

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-indigo-950 dark:text-slate-100 tracking-tight">
              {resolvedPortal === 'owner' ? 'Student enquiries' : 'Connect requests & enquiries'}
            </h1>
            <p className="text-sm text-stone-600 dark:text-slate-300 mt-1">
              {resolvedPortal === 'owner'
                ? 'Review student profiles, accept enquiries to open chat, and coordinate visits.'
                : 'Manage roommate invitations and track property enquiries you have sent.'}
            </p>
          </div>

          {resolvedPortal === 'student' && (
            <div className="inline-flex items-center p-1 rounded-xl bg-stone-200/70 dark:bg-slate-800 self-start">
              <button
                type="button"
                onClick={() => setTab('received')}
                className={`px-4 py-2 min-h-[40px] rounded-lg text-sm font-semibold transition-colors cursor-pointer tabular-nums ${
                  tab === 'received'
                    ? 'bg-white dark:bg-slate-900 text-indigo-950 dark:text-slate-100 shadow-xs'
                    : 'text-stone-600 dark:text-slate-300 hover:text-stone-900 dark:hover:text-white'
                }`}
              >
                Received ({received.length})
              </button>
              <button
                type="button"
                onClick={() => setTab('sent')}
                className={`px-4 py-2 min-h-[40px] rounded-lg text-sm font-semibold transition-colors cursor-pointer tabular-nums ${
                  tab === 'sent'
                    ? 'bg-white dark:bg-slate-900 text-indigo-950 dark:text-slate-100 shadow-xs'
                    : 'text-stone-600 dark:text-slate-300 hover:text-stone-900 dark:hover:text-white'
                }`}
              >
                Sent ({sent.length})
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="bg-white dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-2xl p-10 shadow-sm dark:shadow-none flex items-center justify-center gap-3 text-sm text-stone-600 dark:text-slate-300">
            <Loader2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-spin" aria-hidden="true" />
            <span>Loading requests...</span>
          </div>
        ) : activeList.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-2xl p-8 sm:p-12 text-center shadow-[0_2px_16px_-4px_rgba(26,25,43,0.07)] dark:shadow-none">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 mb-4">
              {resolvedPortal === 'owner' || tab === 'received' ? (
                <Inbox className="w-6 h-6" aria-hidden="true" />
              ) : (
                <Send className="w-6 h-6" aria-hidden="true" />
              )}
            </div>
            <h2 className="font-display text-lg font-bold text-indigo-950 dark:text-slate-100 mb-1.5">
              {resolvedPortal === 'owner'
                ? 'No student enquiries yet'
                : tab === 'received'
                  ? 'No received requests yet'
                  : 'No sent requests yet'}
            </h2>
            <p className="text-sm text-stone-600 dark:text-slate-300 max-w-md mx-auto mb-6">
              {resolvedPortal === 'owner'
                ? 'When students send an enquiry on one of your active listings, their profile summary will appear here.'
                : tab === 'received'
                  ? 'When another student sends you a roommate request, it will appear right here.'
                  : 'Browse compatible matches or Rooms & PGs and send a hello to start connecting.'}
            </p>
            <Link
              to={resolvedPortal === 'owner' ? '/owner' : '/dashboard'}
              className="inline-flex items-center justify-center px-5 py-2.5 min-h-[44px] rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
            >
              {resolvedPortal === 'owner' ? 'Manage listings' : 'Browse matches'}
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {activeList.map((req) => {
              const isIncoming = resolvedPortal === 'owner' || tab === 'received';
              const otherId = isIncoming ? req.fromUserId : req.toUserId;
              const studentProfile = profilesMap.get(otherId);
              const ownerProfile = ownersMap.get(otherId);
              const isOwnerTarget = Boolean(req.listingId && !isIncoming);

              const displayName = isOwnerTarget
                ? ownerProfile?.name || 'Property Owner'
                : studentProfile?.basics.name || ownerProfile?.name || 'Student';
              const displayAvatar = isOwnerTarget
                ? ownerProfile?.avatar
                : studentProfile?.basics.avatar || ownerProfile?.avatar;

              const score =
                resolvedPortal === 'student' && !req.listingId && myProfile && studentProfile
                  ? compareProfiles(myProfile, studentProfile).score
                  : null;

              return (
                <article
                  key={req.id}
                  className="bg-white dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-[0_2px_16px_-4px_rgba(26,25,43,0.07)] dark:shadow-none flex flex-col sm:flex-row sm:items-start justify-between gap-4"
                >
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    <Avatar name={displayName} avatar={displayAvatar} size="md" />
                    <div className="min-w-0 space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {resolvedPortal === 'student' && !isOwnerTarget && studentProfile ? (
                          <Link
                            to={`/dashboard/profile/${otherId}`}
                            className="font-display text-base font-bold text-indigo-950 dark:text-slate-100 hover:text-indigo-700 dark:hover:text-indigo-400"
                          >
                            {displayName}
                          </Link>
                        ) : (
                          <span className="font-display text-base font-bold text-indigo-950 dark:text-slate-100">
                            {displayName}
                          </span>
                        )}
                        <span className="text-xs font-semibold capitalize text-stone-500 dark:text-slate-400">
                          · {req.status}
                        </span>
                      </div>

                      {req.listingId && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold">
                          <Building2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                          <Link
                            to={
                              resolvedPortal === 'owner'
                                ? `/owner/listings/${req.listingId}/edit`
                                : `/dashboard/rooms/${req.listingId}`
                            }
                            className="hover:underline"
                          >
                            {req.listingTitle || 'Property enquiry'}
                          </Link>
                        </div>
                      )}

                      {studentProfile && (!isOwnerTarget || resolvedPortal === 'owner') && (
                        <p className="text-xs text-stone-600 dark:text-slate-300">
                          {studentProfile.basics.college}
                          {studentProfile.basics.courseYear ? ` (${studentProfile.basics.courseYear})` : ''}
                          {' · '}
                          {studentProfile.housing.preferredCity}
                        </p>
                      )}

                      {isOwnerTarget && ownerProfile?.city && (
                        <p className="text-xs text-stone-600 dark:text-slate-300">
                          Property Owner · {ownerProfile.city}
                        </p>
                      )}

                      {/* Owner view of student's lifestyle summary */}
                      {resolvedPortal === 'owner' && studentProfile && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          <span className="px-2 py-0.5 rounded-md bg-[#f8f7f4] dark:bg-slate-800 text-[11px] font-medium text-stone-700 dark:text-slate-300">
                            Sleep: {formatTraitAnswer('sleepSchedule', studentProfile.lifestyle.sleepSchedule)}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-[#f8f7f4] dark:bg-slate-800 text-[11px] font-medium text-stone-700 dark:text-slate-300">
                            Diet: {formatTraitAnswer('diet', studentProfile.lifestyle.diet)}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-[#f8f7f4] dark:bg-slate-800 text-[11px] font-medium text-stone-700 dark:text-slate-300">
                            Smoking: {formatTraitAnswer('smoking', studentProfile.lifestyle.smoking)}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-[#f8f7f4] dark:bg-slate-800 text-[11px] font-medium text-stone-700 dark:text-slate-300">
                            Cleanliness: {studentProfile.lifestyle.cleanliness}/5
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-[#f8f7f4] dark:bg-slate-800 text-[11px] font-medium text-stone-700 dark:text-slate-300">
                            Guests: {formatTraitAnswer('guests', studentProfile.lifestyle.guests)}
                          </span>
                        </div>
                      )}

                      {req.message && (
                        <p className="text-sm text-stone-700 dark:text-slate-200 bg-[#f8f7f4] dark:bg-slate-800/70 rounded-xl px-3.5 py-2 mt-2">
                          &ldquo;{req.message}&rdquo;
                        </p>
                      )}

                      {resolvedPortal === 'student' &&
                        req.status === 'accepted' &&
                        req.ownerPhone && (
                          <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1.5 rounded-lg mt-1">
                            <Phone className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Owner phone unlocked: {req.ownerPhone}</span>
                          </p>
                        )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    {score !== null && <CompatibilityRing score={score} size="sm" />}

                    {isIncoming && req.status === 'pending' && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleAction(req, 'declined')}
                          disabled={actingId === req.id}
                          className="inline-flex items-center gap-1 px-3.5 py-2 min-h-[42px] rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-semibold text-stone-700 dark:text-slate-200 hover:bg-stone-50 dark:hover:bg-slate-700 cursor-pointer"
                        >
                          <X className="w-4 h-4" aria-hidden="true" />
                          <span>Decline</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAction(req, 'accepted')}
                          disabled={actingId === req.id}
                          className="inline-flex items-center gap-1 px-4 py-2 min-h-[42px] rounded-xl bg-indigo-600 text-white text-xs sm:text-sm font-semibold hover:bg-indigo-700 cursor-pointer"
                        >
                          <Check className="w-4 h-4" aria-hidden="true" />
                          <span>Accept</span>
                        </button>
                      </div>
                    )}

                    {!isIncoming && req.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => handleAction(req, 'cancelled')}
                        disabled={actingId === req.id}
                        className="px-3.5 py-2 min-h-[42px] rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-semibold text-stone-700 dark:text-slate-200 hover:bg-stone-50 dark:hover:bg-slate-700 cursor-pointer"
                      >
                        {actingId === req.id ? 'Cancelling...' : 'Cancel'}
                      </button>
                    )}

                    {req.status === 'accepted' && (
                      <Link
                        to={resolvedPortal === 'owner' ? '/owner/chat' : '/dashboard/chat'}
                        className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[42px] rounded-xl bg-indigo-600 text-white text-xs sm:text-sm font-semibold hover:bg-indigo-700 transition-colors"
                      >
                        <MessageSquare className="w-4 h-4" aria-hidden="true" />
                        <span>Chat</span>
                      </Link>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
