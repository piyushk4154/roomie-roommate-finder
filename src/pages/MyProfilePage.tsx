import { AlertTriangle, Ban, Loader2, ShieldOff, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { DashboardNavbar } from '../components/DashboardNavbar';
import { Footer } from '../components/Footer';
import { ProfileFormWizard } from '../components/ProfileFormWizard';
import { useAuth } from '../services/AuthContext';
import { getAllMatchableProfiles, getProfile } from '../services/profileService';
import {
  deleteAccountAndData,
  subscribeToBlocks,
  unblockUser,
} from '../services/safetyService';
import { useToast } from '../services/ToastContext';
import type { RoommateProfile, UserBlock } from '../services/types';

export function MyProfilePage() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<RoommateProfile | null>(null);
  const [blocks, setBlocks] = useState<UserBlock[]>([]);
  const [profilesMap, setProfilesMap] = useState<Map<string, RoommateProfile>>(new Map());
  const [loading, setLoading] = useState(true);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    return subscribeToBlocks(user.uid, (list) => {
      setBlocks(list.filter((b) => b.byUserId === user.uid));
    });
  }, [user?.uid]);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!user?.uid) return;
      setLoading(true);
      try {
        const [mine, all] = await Promise.all([getProfile(user.uid), getAllMatchableProfiles()]);
        if (active) {
          setProfile(mine);
          setProfilesMap(new Map(all.map((p) => [p.userId, p])));
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

  const handleUnblock = async (block: UserBlock) => {
    setUnblockingId(block.id);
    try {
      await unblockUser(block.id);
      const name = profilesMap.get(block.targetUserId)?.basics.name || 'User';
      showToast(`${name} has been unblocked.`, 'info');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to unblock user.', 'error');
    } finally {
      setUnblockingId(null);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user?.uid || deletingAccount) return;
    setDeletingAccount(true);
    try {
      await deleteAccountAndData(user.uid);
      await logout();
      showToast('Your account and data have been deleted.', 'info');
      navigate('/', { replace: true });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to delete account.', 'error');
      setDeletingAccount(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f7f4] text-stone-900 flex flex-col">
      <DashboardNavbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-10">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-indigo-950 tracking-tight">
            My Profile & Safety
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Update your lifestyle preferences anytime, manage blocked users, or delete your account.
          </p>
        </div>

        {loading ? (
          <div className="max-w-3xl mx-auto bg-white rounded-2xl p-10 shadow-sm flex items-center justify-center gap-3 text-sm text-stone-600">
            <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" aria-hidden="true" />
            <span>Loading your profile...</span>
          </div>
        ) : (
          <ProfileFormWizard
            initialProfile={profile}
            mode="edit"
            onSaved={(updated) => setProfile(updated)}
          />
        )}

        {/* Blocked Users Section */}
        <section className="max-w-3xl mx-auto bg-white rounded-2xl p-6 sm:p-8 shadow-[0_2px_18px_-4px_rgba(26,25,43,0.07)]">
          <div className="flex items-center gap-2.5 mb-2">
            <Ban className="w-5 h-5 text-indigo-700" aria-hidden="true" />
            <h2 className="font-display text-lg font-bold text-indigo-950">Blocked users</h2>
          </div>
          <p className="text-sm text-stone-600 mb-5">
            Blocked students cannot see you in matches, requests, or chat.
          </p>

          {blocks.length === 0 ? (
            <p className="text-sm text-stone-500 bg-[#f8f7f4] rounded-xl px-4 py-3">
              You have not blocked anyone.
            </p>
          ) : (
            <div className="divide-y divide-stone-200/80">
              {blocks.map((block) => {
                const target = profilesMap.get(block.targetUserId);
                return (
                  <div
                    key={block.id}
                    className="py-3.5 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar
                        name={target?.basics.name || 'Student'}
                        avatar={target?.basics.avatar}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-indigo-950 truncate">
                          {target?.basics.name || block.targetUserId}
                        </p>
                        {target && (
                          <p className="text-xs text-stone-500 truncate">{target.basics.college}</p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUnblock(block)}
                      disabled={unblockingId === block.id}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-xl border border-stone-200 text-xs font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer shrink-0"
                    >
                      <ShieldOff className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{unblockingId === block.id ? 'Unblocking...' : 'Unblock'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Delete Account & Data */}
        <section className="max-w-3xl mx-auto bg-white rounded-2xl p-6 sm:p-8 shadow-[0_2px_18px_-4px_rgba(26,25,43,0.07)]">
          <h2 className="font-display text-lg font-bold text-rose-800 mb-1.5">
            Delete account and data
          </h2>
          <p className="text-sm text-stone-600 mb-5 leading-relaxed">
            Permanently remove your Roomie profile, connect requests, messages, and blocks. This
            action cannot be undone.
          </p>
          <button
            type="button"
            onClick={() => setDeleteDialogOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl border border-rose-300 bg-rose-50 text-rose-700 text-sm font-semibold hover:bg-rose-100 transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
            <span>Delete my account and data</span>
          </button>
        </section>
      </main>

      {deleteDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/45 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-title"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-start gap-3 mb-4">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-rose-50 text-rose-600 shrink-0">
                <AlertTriangle className="w-5 h-5" aria-hidden="true" />
              </span>
              <div>
                <h2 id="delete-account-title" className="font-display text-lg font-bold text-indigo-950">
                  Delete your account?
                </h2>
                <p className="text-sm text-stone-600 mt-1 leading-relaxed">
                  All of your profile information, roommate requests, and messages will be
                  permanently removed.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteDialogOpen(false)}
                disabled={deletingAccount}
                className="px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold text-stone-700 hover:bg-stone-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deletingAccount}
                className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 disabled:opacity-70 cursor-pointer"
              >
                {deletingAccount && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                <span>{deletingAccount ? 'Deleting...' : 'Yes, delete everything'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
