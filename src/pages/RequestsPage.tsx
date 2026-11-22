import { Check, Inbox, Loader2, MessageSquare, Send, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { CompatibilityRing } from '../components/CompatibilityRing';
import { DashboardNavbar } from '../components/DashboardNavbar';
import { Footer } from '../components/Footer';
import { useAuth } from '../services/AuthContext';
import { getAllMatchableProfiles, getProfile } from '../services/profileService';
import { subscribeToUserRequests, updateRequestStatus } from '../services/requestService';
import { getBlockedUserIdSet, subscribeToBlocks } from '../services/safetyService';
import { useToast } from '../services/ToastContext';
import type { ConnectRequest, RoommateProfile } from '../services/types';
import { compareProfiles } from '../utils/matching';

export function RequestsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [tab, setTab] = useState<'received' | 'sent'>('received');
  const [requests, setRequests] = useState<ConnectRequest[]>([]);
  const [profilesMap, setProfilesMap] = useState<Map<string, RoommateProfile>>(new Map());
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
        const [mine, all] = await Promise.all([getProfile(user.uid), getAllMatchableProfiles()]);
        if (active) {
          setMyProfile(mine);
          setProfilesMap(new Map(all.map((p) => [p.userId, p])));
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadProfiles();
    return () => {
      active = false;
    };
  }, [user?.uid]);

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
      await updateRequestStatus(request, user.uid, nextStatus);
      showToast(
        nextStatus === 'accepted'
          ? 'Request accepted! Chat is now open.'
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

  const activeList = tab === 'received' ? received : sent;

  return (
    <div className="min-h-screen bg-[#f8f7f4] text-stone-900 flex flex-col">
      <DashboardNavbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-indigo-950 tracking-tight">
              Connect requests
            </h1>
            <p className="text-sm text-stone-600 mt-1">
              Manage incoming roommate invitations and track requests you have sent.
            </p>
          </div>

          <div className="inline-flex items-center p-1 rounded-xl bg-stone-200/70 self-start">
            <button
              type="button"
              onClick={() => setTab('received')}
              className={`px-4 py-2 min-h-[40px] rounded-lg text-sm font-semibold transition-colors cursor-pointer tabular-nums ${
                tab === 'received'
                  ? 'bg-white text-indigo-950 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Received ({received.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('sent')}
              className={`px-4 py-2 min-h-[40px] rounded-lg text-sm font-semibold transition-colors cursor-pointer tabular-nums ${
                tab === 'sent'
                  ? 'bg-white text-indigo-950 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Sent ({sent.length})
            </button>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl p-10 shadow-sm flex items-center justify-center gap-3 text-sm text-stone-600">
            <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" aria-hidden="true" />
            <span>Loading requests...</span>
          </div>
        ) : activeList.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 sm:p-12 text-center shadow-[0_2px_16px_-4px_rgba(26,25,43,0.07)]">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 mb-4">
              {tab === 'received' ? (
                <Inbox className="w-6 h-6" aria-hidden="true" />
              ) : (
                <Send className="w-6 h-6" aria-hidden="true" />
              )}
            </div>
            <h2 className="font-display text-lg font-bold text-indigo-950 mb-1.5">
              {tab === 'received' ? 'No received requests yet' : 'No sent requests yet'}
            </h2>
            <p className="text-sm text-stone-600 max-w-md mx-auto mb-6">
              {tab === 'received'
                ? 'When another student sends you a roommate request, it will appear right here.'
                : 'Browse your compatible matches and send a quick hello to start connecting.'}
            </p>
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center px-5 py-2.5 min-h-[44px] rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
            >
              Browse matches
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {activeList.map((req) => {
              const otherId = tab === 'received' ? req.fromUserId : req.toUserId;
              const otherProfile = profilesMap.get(otherId);
              const score =
                myProfile && otherProfile
                  ? compareProfiles(myProfile, otherProfile).score
                  : null;

              return (
                <article
                  key={req.id}
                  className="bg-white rounded-2xl p-5 sm:p-6 shadow-[0_2px_16px_-4px_rgba(26,25,43,0.07)] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4 min-w-0">
                    <Avatar
                      name={otherProfile?.basics.name || 'Student'}
                      avatar={otherProfile?.basics.avatar}
                      size="md"
                    />
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          to={`/dashboard/profile/${otherId}`}
                          className="font-display text-base font-bold text-indigo-950 hover:text-indigo-700"
                        >
                          {otherProfile?.basics.name || 'Student'}
                        </Link>
                        <span className="text-xs font-semibold capitalize text-stone-500">
                          · {req.status}
                        </span>
                      </div>
                      {otherProfile && (
                        <p className="text-xs text-stone-600">
                          {otherProfile.basics.college} · {otherProfile.housing.preferredCity}
                        </p>
                      )}
                      {req.message && (
                        <p className="text-sm text-stone-700 bg-[#f8f7f4] rounded-xl px-3.5 py-2 mt-2">
                          "{req.message}"
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    {score !== null && <CompatibilityRing score={score} size="sm" />}

                    {tab === 'received' && req.status === 'pending' && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleAction(req, 'declined')}
                          disabled={actingId === req.id}
                          className="inline-flex items-center gap-1 px-3.5 py-2 min-h-[42px] rounded-xl border border-stone-200 text-xs sm:text-sm font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer"
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

                    {tab === 'sent' && req.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => handleAction(req, 'cancelled')}
                        disabled={actingId === req.id}
                        className="px-3.5 py-2 min-h-[42px] rounded-xl border border-stone-200 text-xs sm:text-sm font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer"
                      >
                        {actingId === req.id ? 'Cancelling...' : 'Cancel'}
                      </button>
                    )}

                    {req.status === 'accepted' && (
                      <Link
                        to="/dashboard/chat"
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
