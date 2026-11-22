import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  CircleDot,
  Flag,
  Loader2,
  MessageSquare,
  Send,
  XCircle,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { CompatibilityRing } from '../components/CompatibilityRing';
import { DashboardNavbar } from '../components/DashboardNavbar';
import { Footer } from '../components/Footer';
import { formatINR } from '../components/ProfileFormWizard';
import { BlockUserModal, ReportUserModal } from '../components/SafetyModals';
import { useAuth } from '../services/AuthContext';
import { getProfile } from '../services/profileService';
import {
  sendConnectRequest,
  subscribeToUserRequests,
  updateRequestStatus,
} from '../services/requestService';
import { getBlockedUserIdSet, subscribeToBlocks } from '../services/safetyService';
import { useToast } from '../services/ToastContext';
import type { ConnectRequest, RoommateProfile } from '../services/types';
import { compareProfiles } from '../utils/matching';

const GENDER_LABELS: Record<string, string> = {
  male: 'Male',
  female: 'Female',
  other: 'Other',
  prefer_not_to_say: 'Prefer not to say',
};

export function ProfileDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [myProfile, setMyProfile] = useState<RoommateProfile | null>(null);
  const [targetProfile, setTargetProfile] = useState<RoommateProfile | null>(null);
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [requests, setRequests] = useState<ConnectRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const [introMessage, setIntroMessage] = useState('');
  const [sendingRequest, setSendingRequest] = useState(false);
  const [updatingRequest, setUpdatingRequest] = useState(false);

  const [reportOpen, setReportOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    const unsubBlocks = subscribeToBlocks(user.uid, (blocks) => {
      setBlockedIds(getBlockedUserIdSet(user.uid, blocks));
    });
    const unsubReqs = subscribeToUserRequests(user.uid, (reqs) => {
      setRequests(reqs);
    });
    return () => {
      unsubBlocks();
      unsubReqs();
    };
  }, [user?.uid]);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!user?.uid || !userId) {
        if (active) setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const [mine, target] = await Promise.all([getProfile(user.uid), getProfile(userId)]);
        if (active) {
          setMyProfile(mine);
          setTargetProfile(target);
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [user?.uid, userId]);

  const comparison = useMemo(() => {
    if (!myProfile || !targetProfile) return null;
    return compareProfiles(myProfile, targetProfile);
  }, [myProfile, targetProfile]);

  const activeRequest = useMemo(() => {
    if (!user?.uid || !userId) return null;
    return (
      requests.find(
        (r) =>
          ((r.fromUserId === user.uid && r.toUserId === userId) ||
            (r.fromUserId === userId && r.toUserId === user.uid)) &&
          r.status !== 'cancelled',
      ) || null
    );
  }, [requests, user?.uid, userId]);

  const isUnavailable =
    !loading &&
    (!targetProfile ||
      !targetProfile.isComplete ||
      targetProfile.userId === user?.uid ||
      (userId ? blockedIds.has(userId) : false) ||
      Boolean(comparison?.excluded));

  const handleSendRequest = async () => {
    if (!user?.uid || !targetProfile || sendingRequest) return;
    setSendingRequest(true);
    try {
      await sendConnectRequest(user.uid, targetProfile.userId, introMessage, (demoName) => {
        showToast(`${demoName} accepted your connect request! You can now chat.`, 'success');
      });
      setIntroMessage('');
      showToast(
        targetProfile.isDemo
          ? `Request sent to ${targetProfile.basics.name}! Demo profiles accept in ~5 seconds.`
          : `Connect request sent to ${targetProfile.basics.name}.`,
        'success',
      );
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Could not send connect request.',
        'error',
      );
    } finally {
      setSendingRequest(false);
    }
  };

  const handleUpdateRequest = async (status: 'accepted' | 'declined' | 'cancelled') => {
    if (!user?.uid || !activeRequest || updatingRequest) return;
    setUpdatingRequest(true);
    try {
      await updateRequestStatus(activeRequest, user.uid, status);
      const label =
        status === 'accepted'
          ? 'Request accepted! Chat is now open.'
          : status === 'declined'
            ? 'Request declined.'
            : 'Request cancelled.';
      showToast(label, status === 'accepted' ? 'success' : 'info');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to update request.', 'error');
    } finally {
      setUpdatingRequest(false);
    }
  };

  const bestMatches = useMemo(
    () => (comparison ? comparison.breakdown.filter((b) => b.status === 'match').slice(0, 3) : []),
    [comparison],
  );

  const thingsToDiscuss = useMemo(
    () =>
      comparison
        ? comparison.breakdown
            .filter((b) => b.status !== 'match')
            .sort((a, b) => a.similarity - b.similarity)
            .slice(0, 3)
        : [],
    [comparison],
  );

  return (
    <div className="min-h-screen bg-[#f8f7f4] text-stone-900 flex flex-col">
      <DashboardNavbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {loading ? (
          <div className="bg-white rounded-2xl p-10 shadow-sm flex items-center justify-center gap-3 text-sm text-stone-600">
            <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" aria-hidden="true" />
            <span>Loading profile details...</span>
          </div>
        ) : isUnavailable || !targetProfile || !comparison ? (
          <div className="bg-white rounded-2xl p-8 sm:p-12 text-center shadow-[0_2px_18px_-4px_rgba(26,25,43,0.07)]">
            <h1 className="font-display text-2xl font-bold text-indigo-950 mb-2">
              Profile not available
            </h1>
            <p className="text-sm text-stone-600 max-w-md mx-auto leading-relaxed mb-6">
              This profile may be incomplete, blocked, or excluded based on your deal-breakers,
              gender preference, or budget range.
            </p>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              <span>Back to matches</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Top Navigation + Safety */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 text-sm font-semibold text-stone-700 hover:text-indigo-700 py-2"
              >
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                <span>Back to matches</span>
              </Link>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setReportOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl border border-stone-200 bg-white text-xs font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer"
                >
                  <Flag className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Report</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBlockOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl border border-rose-200 bg-white text-xs font-semibold text-rose-700 hover:bg-rose-50 cursor-pointer"
                >
                  <Ban className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Block</span>
                </button>
              </div>
            </div>

            {/* Header Card */}
            <section className="bg-white rounded-2xl p-6 sm:p-8 shadow-[0_2px_18px_-4px_rgba(26,25,43,0.07)]">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
                <div className="flex items-start gap-4 sm:gap-5">
                  <Avatar
                    name={targetProfile.basics.name}
                    avatar={targetProfile.basics.avatar}
                    size="xl"
                  />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="font-display text-2xl sm:text-3xl font-bold text-indigo-950 tracking-tight">
                        {targetProfile.basics.name}, {targetProfile.basics.age}
                      </h1>
                      {targetProfile.isDemo && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-semibold">
                          Demo profile
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-stone-700 mt-1">
                      {targetProfile.basics.college} · {targetProfile.basics.courseYear}
                    </p>
                    <p className="text-xs sm:text-sm text-stone-500 mt-1">
                      {GENDER_LABELS[targetProfile.basics.gender] || targetProfile.basics.gender} ·{' '}
                      {targetProfile.housing.preferredArea}, {targetProfile.housing.preferredCity}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-start sm:self-center">
                  <CompatibilityRing score={comparison.score} size="lg" />
                </div>
              </div>

              {targetProfile.basics.bio && (
                <p className="mt-5 text-sm sm:text-base text-stone-700 leading-relaxed">
                  {targetProfile.basics.bio}
                </p>
              )}

              <div className="mt-5 pt-5 border-t border-stone-200/80 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-xs text-stone-500 block">Monthly budget</span>
                  <span className="font-semibold text-indigo-950 tabular-nums">
                    {formatINR(targetProfile.housing.budgetMin)} –{' '}
                    {formatINR(targetProfile.housing.budgetMax)}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-stone-500 block">Move-in date</span>
                  <span className="font-semibold text-indigo-950 tabular-nums">
                    {targetProfile.housing.moveInDate}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-stone-500 block">Roommate preference</span>
                  <span className="font-semibold text-indigo-950">
                    {targetProfile.housing.roommateGenderPref === 'same_gender'
                      ? 'Same gender only'
                      : 'Any gender'}
                  </span>
                </div>
              </div>

              {/* Generated Compatibility Summary */}
              <div className="mt-5 rounded-xl bg-indigo-50/70 px-4 py-3 text-sm text-indigo-950 font-medium">
                {comparison.summary}
              </div>

              {/* Connect Request Box */}
              <div className="mt-6 pt-5 border-t border-stone-200/80">
                {!activeRequest ? (
                  <div className="space-y-3">
                    <label
                      htmlFor="connect-message"
                      className="block text-sm font-semibold text-indigo-950"
                    >
                      Send a connect request (optional note)
                    </label>
                    <textarea
                      id="connect-message"
                      rows={2}
                      maxLength={300}
                      value={introMessage}
                      onChange={(e) => setIntroMessage(e.target.value)}
                      placeholder={`Say hi to ${targetProfile.basics.name.split(' ')[0]} and mention your move-in timeline...`}
                      className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                    />
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="text-xs text-stone-500">
                        {targetProfile.isDemo
                          ? 'Demo profile: auto-accepts after ~5 seconds so you can test chat.'
                          : 'Once accepted, direct chat unlocks for both of you.'}
                      </span>
                      <button
                        type="button"
                        onClick={handleSendRequest}
                        disabled={sendingRequest}
                        className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-70 cursor-pointer"
                      >
                        {sendingRequest ? (
                          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <Send className="w-4 h-4" aria-hidden="true" />
                        )}
                        <span>{sendingRequest ? 'Sending...' : 'Send connect request'}</span>
                      </button>
                    </div>
                  </div>
                ) : activeRequest.status === 'accepted' ? (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">
                      <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
                      <span>Connected with {targetProfile.basics.name}</span>
                    </div>
                    <Link
                      to="/dashboard/chat"
                      className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
                    >
                      <MessageSquare className="w-4 h-4" aria-hidden="true" />
                      <span>Open chat</span>
                    </Link>
                  </div>
                ) : activeRequest.status === 'pending' ? (
                  activeRequest.fromUserId === user?.uid ? (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-amber-700">
                        Connect request pending
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateRequest('cancelled')}
                        disabled={updatingRequest}
                        className="px-4 py-2 min-h-[40px] rounded-xl border border-stone-200 text-sm font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer"
                      >
                        {updatingRequest ? 'Cancelling...' : 'Cancel request'}
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-indigo-950">
                        {targetProfile.basics.name} sent you a connect request
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleUpdateRequest('declined')}
                          disabled={updatingRequest}
                          className="px-4 py-2 min-h-[40px] rounded-xl border border-stone-200 text-sm font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer"
                        >
                          Decline
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateRequest('accepted')}
                          disabled={updatingRequest}
                          className="px-4 py-2 min-h-[40px] rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 cursor-pointer"
                        >
                          Accept
                        </button>
                      </div>
                    </div>
                  )
                ) : (
                  <p className="text-sm font-medium text-stone-500">
                    Connect request was declined.
                  </p>
                )}
              </div>
            </section>

            {/* Best Matches & Things to Discuss */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <section className="bg-white rounded-2xl p-6 shadow-[0_2px_16px_-4px_rgba(26,25,43,0.07)]">
                <h2 className="font-display text-base font-bold text-indigo-950 mb-3">
                  Best matches
                </h2>
                {bestMatches.length === 0 ? (
                  <p className="text-sm text-stone-500">No exact trait matches found.</p>
                ) : (
                  <ul className="space-y-2.5">
                    {bestMatches.map((item) => (
                      <li key={item.key} className="flex items-start gap-2.5 text-sm">
                        <CheckCircle2
                          className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5"
                          aria-hidden="true"
                        />
                        <div>
                          <span className="font-semibold text-stone-900">{item.trait}: </span>
                          <span className="text-stone-600">{item.theirAnswer}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="bg-white rounded-2xl p-6 shadow-[0_2px_16px_-4px_rgba(26,25,43,0.07)]">
                <h2 className="font-display text-base font-bold text-indigo-950 mb-3">
                  Things to discuss
                </h2>
                {thingsToDiscuss.length === 0 ? (
                  <p className="text-sm text-stone-500">
                    Everything aligns—no major lifestyle differences!
                  </p>
                ) : (
                  <ul className="space-y-2.5">
                    {thingsToDiscuss.map((item) => (
                      <li key={item.key} className="flex items-start gap-2.5 text-sm">
                        {item.status === 'partial' ? (
                          <CircleDot
                            className="w-4 h-4 text-amber-500 shrink-0 mt-0.5"
                            aria-hidden="true"
                          />
                        ) : (
                          <XCircle
                            className="w-4 h-4 text-rose-600 shrink-0 mt-0.5"
                            aria-hidden="true"
                          />
                        )}
                        <div>
                          <span className="font-semibold text-stone-900">{item.trait}: </span>
                          <span className="text-stone-600">
                            You ({item.yourAnswer}) vs. Them ({item.theirAnswer})
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            {/* Trait-by-Trait Breakdown */}
            <section className="bg-white rounded-2xl p-6 sm:p-8 shadow-[0_2px_16px_-4px_rgba(26,25,43,0.07)]">
              <h2 className="font-display text-lg font-bold text-indigo-950 mb-4">
                Lifestyle comparison
              </h2>

              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-stone-200 text-xs font-semibold text-stone-500">
                      <th className="py-3 pr-4">Trait</th>
                      <th className="py-3 pr-4">You</th>
                      <th className="py-3 pr-4">Them</th>
                      <th className="py-3 text-right">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {comparison.breakdown.map((row) => (
                      <tr key={row.key}>
                        <td className="py-3.5 pr-4 align-top">
                          <p className="text-sm font-semibold text-indigo-950">{row.trait}</p>
                          <p className="text-xs text-stone-500 mt-0.5">{row.explanation}</p>
                        </td>
                        <td className="py-3.5 pr-4 text-sm text-stone-700 align-top whitespace-nowrap">
                          {row.yourAnswer}
                        </td>
                        <td className="py-3.5 pr-4 text-sm text-stone-700 align-top whitespace-nowrap">
                          {row.theirAnswer}
                        </td>
                        <td className="py-3.5 text-right align-top">
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap">
                            {row.status === 'match' && (
                              <>
                                <CheckCircle2
                                  className="w-4 h-4 text-emerald-600"
                                  aria-hidden="true"
                                />
                                <span className="text-emerald-700">Match</span>
                              </>
                            )}
                            {row.status === 'partial' && (
                              <>
                                <CircleDot
                                  className="w-4 h-4 text-amber-500"
                                  aria-hidden="true"
                                />
                                <span className="text-amber-700">Partial</span>
                              </>
                            )}
                            {row.status === 'mismatch' && (
                              <>
                                <XCircle className="w-4 h-4 text-rose-600" aria-hidden="true" />
                                <span className="text-rose-700">Mismatch</span>
                              </>
                            )}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Stacked Cards */}
              <div className="md:hidden space-y-3">
                {comparison.breakdown.map((row) => (
                  <div key={row.key} className="rounded-xl bg-[#f8f7f4] p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-indigo-950">{row.trait}</p>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold">
                        {row.status === 'match' && (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                            <span className="text-emerald-700">Match</span>
                          </>
                        )}
                        {row.status === 'partial' && (
                          <>
                            <CircleDot className="w-4 h-4 text-amber-500" aria-hidden="true" />
                            <span className="text-amber-700">Partial</span>
                          </>
                        )}
                        {row.status === 'mismatch' && (
                          <>
                            <XCircle className="w-4 h-4 text-rose-600" aria-hidden="true" />
                            <span className="text-rose-700">Mismatch</span>
                          </>
                        )}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-stone-500 block">You</span>
                        <span className="font-medium text-stone-800">{row.yourAnswer}</span>
                      </div>
                      <div>
                        <span className="text-stone-500 block">Them</span>
                        <span className="font-medium text-stone-800">{row.theirAnswer}</span>
                      </div>
                    </div>
                    <p className="text-xs text-stone-600">{row.explanation}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </main>

      {user?.uid && targetProfile && (
        <>
          <ReportUserModal
            open={reportOpen}
            onClose={() => setReportOpen(false)}
            byUserId={user.uid}
            targetUserId={targetProfile.userId}
            targetName={targetProfile.basics.name}
          />
          <BlockUserModal
            open={blockOpen}
            onClose={() => setBlockOpen(false)}
            byUserId={user.uid}
            targetUserId={targetProfile.userId}
            targetName={targetProfile.basics.name}
            onBlocked={() => navigate('/dashboard', { replace: true })}
          />
        </>
      )}

      <Footer />
    </div>
  );
}
