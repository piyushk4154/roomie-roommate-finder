import { AlertTriangle, Ban, Flag, Loader2, X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { blockUser, submitReport } from '../services/safetyService';
import { useToast } from '../services/ToastContext';
import type { ReportReason } from '../services/types';

interface ReportUserModalProps {
  open: boolean;
  onClose: () => void;
  byUserId: string;
  targetUserId: string;
  targetName: string;
  listingId?: string;
  targetType?: 'user' | 'listing' | 'owner';
}

const USER_REPORT_REASONS: Array<{ value: ReportReason; label: string }> = [
  { value: 'fake_profile', label: 'Fake or misleading profile' },
  { value: 'harassment', label: 'Harassment or abusive behavior' },
  { value: 'inappropriate_content', label: 'Inappropriate content' },
  { value: 'other', label: 'Other safety concern' },
];

const LISTING_REPORT_REASONS: Array<{ value: ReportReason; label: string }> = [
  { value: 'misleading_listing', label: 'Misleading photos, rent, or rules' },
  { value: 'scam_deposit', label: 'Suspicious advance or deposit request' },
  { value: 'already_rented', label: 'Property already rented or unavailable' },
  { value: 'inappropriate_content', label: 'Inappropriate content' },
  { value: 'other', label: 'Other safety concern' },
];

export function ReportUserModal({
  open,
  onClose,
  byUserId,
  targetUserId,
  targetName,
  listingId,
  targetType = listingId ? 'listing' : 'user',
}: ReportUserModalProps) {
  const { showToast } = useToast();
  const reasons = targetType === 'listing' ? LISTING_REPORT_REASONS : USER_REPORT_REASONS;
  const defaultReason: ReportReason =
    targetType === 'listing' ? 'misleading_listing' : 'fake_profile';

  const [reason, setReason] = useState<ReportReason>(defaultReason);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setReason(defaultReason);
    }
  }, [open, defaultReason]);

  if (!open) return null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await submitReport(byUserId, targetUserId, reason, notes, {
        listingId,
        targetType,
      });
      showToast(`Report submitted for ${targetName}. Thank you for keeping Roomie safe.`, 'success');
      setNotes('');
      onClose();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Unable to submit report right now.',
        'error',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/45 dark:bg-black/70 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
    >
      <div className="bg-white dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
              <Flag className="w-4 h-4" aria-hidden="true" />
            </span>
            <div>
              <h2 id="report-modal-title" className="font-display text-lg font-bold text-indigo-950 dark:text-slate-100">
                Report {targetName}
              </h2>
              <p className="text-xs text-stone-500 dark:text-slate-400">Your report stays private.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 inline-flex items-center justify-center rounded-xl text-stone-500 dark:text-slate-400 hover:bg-stone-100 dark:hover:bg-slate-800 cursor-pointer"
            aria-label="Close report dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-stone-800 dark:text-slate-200 mb-1">Reason for reporting</legend>
            {reasons.map((item) => (
              <label
                key={item.value}
                className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm cursor-pointer transition-colors ${
                  reason === item.value
                    ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/60 text-indigo-950 dark:text-indigo-100 font-medium'
                    : 'border-stone-200 dark:border-slate-700 text-stone-700 dark:text-slate-200 hover:bg-stone-50 dark:hover:bg-slate-800'
                }`}
              >
                <input
                  type="radio"
                  name="report-reason"
                  value={item.value}
                  checked={reason === item.value}
                  onChange={() => setReason(item.value)}
                  className="accent-indigo-600"
                />
                <span>{item.label}</span>
              </label>
            ))}
          </fieldset>

          <div>
            <label htmlFor="report-notes" className="block text-sm font-medium text-stone-800 dark:text-slate-200 mb-1.5">
              Additional details (optional)
            </label>
            <textarea
              id="report-notes"
              rows={3}
              maxLength={500}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Share any context that helps us review this report..."
              className="w-full rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-stone-900 dark:text-slate-100 placeholder:text-stone-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold text-stone-700 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-70 cursor-pointer"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
              <span>Submit report</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface BlockUserModalProps {
  open: boolean;
  onClose: () => void;
  byUserId: string;
  targetUserId: string;
  targetName: string;
  isOwnerTarget?: boolean;
  onBlocked?: () => void;
}

export function BlockUserModal({
  open,
  onClose,
  byUserId,
  targetUserId,
  targetName,
  isOwnerTarget = false,
  onBlocked,
}: BlockUserModalProps) {
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await blockUser(byUserId, targetUserId);
      showToast(`${targetName} has been blocked.`, 'info');
      onClose();
      onBlocked?.();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to block user.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/45 dark:bg-black/70 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="block-modal-title"
    >
      <div className="bg-white dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-xl">
        <div className="flex items-start gap-3 mb-4">
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 shrink-0">
            <Ban className="w-5 h-5" aria-hidden="true" />
          </span>
          <div>
            <h2 id="block-modal-title" className="font-display text-lg font-bold text-indigo-950 dark:text-slate-100">
              Block {targetName}?
            </h2>
            <p className="text-sm text-stone-600 dark:text-slate-300 mt-1 leading-relaxed">
              {isOwnerTarget
                ? 'You will no longer see their listings, enquiries, or chat conversations. You can unblock them anytime from My Profile.'
                : 'You will no longer see each other in matches, connect requests, or chat conversations. You can unblock them anytime from My Profile.'}
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/70 px-3.5 py-2.5 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2 mb-5">
          <AlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
          <span>Blocking is mutual on Roomie and takes effect immediately.</span>
        </div>

        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold text-stone-700 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 transition-colors disabled:opacity-70 cursor-pointer"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
            <span>Block user</span>
          </button>
        </div>
      </div>
    </div>
  );
}
