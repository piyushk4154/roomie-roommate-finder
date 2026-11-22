import { AlertTriangle, Ban, Check, Loader2, ShieldOff, Trash2 } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AVATAR_PRESETS, Avatar } from '../components/Avatar';
import { Footer } from '../components/Footer';
import { OwnerNavbar } from '../components/OwnerNavbar';
import { useAuth } from '../services/AuthContext';
import {
  getOwnerPublicProfile,
  saveOwnerPublicProfile,
} from '../services/ownerProfileService';
import { getAllMatchableProfiles } from '../services/profileService';
import {
  deleteAccountAndData,
  subscribeToBlocks,
  unblockUser,
} from '../services/safetyService';
import { useToast } from '../services/ToastContext';
import type { RoommateProfile, UserBlock } from '../services/types';
import { validateCity, validateName, validatePhone } from '../utils/validation';

export function OwnerProfilePage() {
  const { user, updateAccount, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name || '');
  const [city, setCity] = useState(user?.city || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState('initials');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [blocks, setBlocks] = useState<UserBlock[]>([]);
  const [studentsMap, setStudentsMap] = useState<Map<string, RoommateProfile>>(new Map());
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
        const [pub, students] = await Promise.all([
          getOwnerPublicProfile(user.uid),
          getAllMatchableProfiles(),
        ]);
        if (!active) return;
        setName(pub?.name || user.name);
        setCity(pub?.city || user.city);
        setPhone(user.phone || '');
        setBio(pub?.bio || '');
        setAvatar(pub?.avatar || 'initials');
        setStudentsMap(new Map(students.map((p) => [p.userId, p])));
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [user?.uid, user?.name, user?.city, user?.phone]);

  const handleSaveProfile = async (event: FormEvent) => {
    event.preventDefault();
    if (!user?.uid || saving) return;

    const nameErr = validateName(name);
    if (nameErr) {
      showToast(nameErr, 'error');
      return;
    }
    const cityErr = validateCity(city);
    if (cityErr) {
      showToast(cityErr, 'error');
      return;
    }
    const phoneErr = validatePhone(phone);
    if (phoneErr) {
      showToast(phoneErr, 'error');
      return;
    }

    setSaving(true);
    try {
      await Promise.all([
        updateAccount({ name, city, phone }),
        saveOwnerPublicProfile(user.uid, { name, city, bio, avatar }),
      ]);
      showToast('Owner profile updated.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to save profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUnblock = async (block: UserBlock) => {
    setUnblockingId(block.id);
    try {
      await unblockUser(block.id);
      const targetName = studentsMap.get(block.targetUserId)?.basics.name || 'User';
      showToast(`${targetName} has been unblocked.`, 'info');
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
      showToast('Your account, listings, and data have been deleted.', 'info');
      navigate('/', { replace: true });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to delete account.', 'error');
      setDeletingAccount(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f7f4] dark:bg-slate-950 text-stone-900 dark:text-slate-100 flex flex-col">
      <OwnerNavbar />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-indigo-950 dark:text-slate-100 tracking-tight">
            Owner Profile &amp; Safety
          </h1>
          <p className="text-sm text-stone-600 dark:text-slate-300 mt-1">
            Manage your owner details, contact privacy, blocked users, and account settings.
          </p>
        </div>

        {loading ? (
          <div className="bg-white dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-2xl p-10 flex items-center justify-center gap-3 text-sm text-stone-600 dark:text-slate-300">
            <Loader2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-spin" aria-hidden="true" />
            <span>Loading owner profile...</span>
          </div>
        ) : (
          <form
            onSubmit={handleSaveProfile}
            className="bg-white dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-[0_2px_18px_-4px_rgba(26,25,43,0.07)] dark:shadow-none space-y-5"
          >
            <div className="flex items-center gap-4">
              <Avatar name={name || 'Owner'} avatar={avatar} size="lg" />
              <div>
                <p className="text-sm font-semibold text-indigo-950 dark:text-slate-100">
                  Public avatar
                </p>
                <p className="text-xs text-stone-500 dark:text-slate-400">
                  Shown on your property cards and chats.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setAvatar('initials')}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer ${
                  avatar === 'initials'
                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300'
                    : 'border-stone-200 dark:border-slate-700 text-stone-600 dark:text-slate-300'
                }`}
              >
                Initials
              </button>
              {AVATAR_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setAvatar(preset.id)}
                  className={`p-1 rounded-xl border cursor-pointer ${
                    avatar === preset.id
                      ? 'border-indigo-600 ring-2 ring-indigo-600/20'
                      : 'border-stone-200 dark:border-slate-700'
                  }`}
                  aria-label={`Select ${preset.label} avatar`}
                >
                  <Avatar name={name || 'O'} avatar={preset.id} size="sm" />
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="owner-name" className="block text-sm font-medium text-stone-800 dark:text-slate-200 mb-1.5">
                  Full name
                </label>
                <input
                  id="owner-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-sm"
                />
              </div>

              <div>
                <label htmlFor="owner-city" className="block text-sm font-medium text-stone-800 dark:text-slate-200 mb-1.5">
                  City
                </label>
                <input
                  id="owner-city"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="owner-phone" className="block text-sm font-medium text-stone-800 dark:text-slate-200 mb-1.5">
                Private phone number <span className="text-xs font-normal text-stone-500 dark:text-slate-400">(optional)</span>
              </label>
              <input
                id="owner-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full min-h-[44px] rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-sm"
              />
              <p className="mt-1 text-xs text-stone-500 dark:text-slate-400">
                Never shown publicly. Shared only with students whose enquiry you explicitly accept.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="owner-bio" className="block text-sm font-medium text-stone-800 dark:text-slate-200">
                  About you / hosting note
                </label>
                <span className="text-xs text-stone-500 dark:text-slate-400 tabular-nums">
                  {bio.length}/300
                </span>
              </div>
              <textarea
                id="owner-bio"
                rows={3}
                maxLength={300}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Share how long you have hosted students, maintenance support, or visiting hours."
                className="w-full rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors cursor-pointer disabled:opacity-60"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Check className="w-4 h-4" aria-hidden="true" />}
                <span>{saving ? 'Saving...' : 'Save profile'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Blocked Users */}
        <section className="bg-white dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-[0_2px_18px_-4px_rgba(26,25,43,0.07)] dark:shadow-none">
          <div className="flex items-center gap-2.5 mb-2">
            <Ban className="w-5 h-5 text-indigo-700 dark:text-indigo-400" aria-hidden="true" />
            <h2 className="font-display text-lg font-bold text-indigo-950 dark:text-slate-100">Blocked users</h2>
          </div>
          <p className="text-sm text-stone-600 dark:text-slate-300 mb-5">
            Blocked students cannot view your listings, send enquiries, or message you.
          </p>

          {blocks.length === 0 ? (
            <p className="text-sm text-stone-500 dark:text-slate-400 bg-[#f8f7f4] dark:bg-slate-800/70 rounded-xl px-4 py-3">
              You have not blocked anyone.
            </p>
          ) : (
            <div className="divide-y divide-stone-200/80 dark:divide-slate-800">
              {blocks.map((block) => {
                const target = studentsMap.get(block.targetUserId);
                return (
                  <div key={block.id} className="py-3.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar
                        name={target?.basics.name || 'Student'}
                        avatar={target?.basics.avatar}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-indigo-950 dark:text-slate-100 truncate">
                          {target?.basics.name || block.targetUserId}
                        </p>
                        {target && (
                          <p className="text-xs text-stone-500 dark:text-slate-400 truncate">
                            {target.basics.college}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUnblock(block)}
                      disabled={unblockingId === block.id}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-stone-700 dark:text-slate-200 hover:bg-stone-50 dark:hover:bg-slate-700 cursor-pointer shrink-0"
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

        {/* Delete Account */}
        <section className="bg-white dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-[0_2px_18px_-4px_rgba(26,25,43,0.07)] dark:shadow-none">
          <h2 className="font-display text-lg font-bold text-rose-800 dark:text-rose-400 mb-1.5">
            Delete account and listings
          </h2>
          <p className="text-sm text-stone-600 dark:text-slate-300 mb-5 leading-relaxed">
            Permanently remove your owner account, all property listings, enquiries, messages, and
            blocks. This action cannot be undone.
          </p>
          <button
            type="button"
            onClick={() => setDeleteDialogOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 text-sm font-semibold hover:bg-rose-100 dark:hover:bg-rose-950 transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
            <span>Delete my account and data</span>
          </button>
        </section>
      </main>

      {deleteDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/45 dark:bg-black/70 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-owner-account-title"
        >
          <div className="bg-white dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-start gap-3 mb-4">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 shrink-0">
                <AlertTriangle className="w-5 h-5" aria-hidden="true" />
              </span>
              <div>
                <h2 id="delete-owner-account-title" className="font-display text-lg font-bold text-indigo-950 dark:text-slate-100">
                  Delete your owner account?
                </h2>
                <p className="text-sm text-stone-600 dark:text-slate-300 mt-1 leading-relaxed">
                  All of your property listings, enquiries, and chat conversations will be permanently
                  deleted.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteDialogOpen(false)}
                disabled={deletingAccount}
                className="px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold text-stone-700 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800 cursor-pointer"
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
