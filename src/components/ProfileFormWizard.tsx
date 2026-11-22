import {
  AlertCircle,
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Loader2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';
import {
  clearProfileDraft,
  createDefaultProfileDraft,
  loadProfileDraft,
  saveProfile,
  saveProfileDraft,
  type ProfileDraft,
} from '../services/profileService';
import { useToast } from '../services/ToastContext';
import { useUnsavedChanges } from '../services/UnsavedChangesContext';
import type {
  CleanlinessLevel,
  DealBreakerKey,
  DietOption,
  DrinkingOption,
  GenderOption,
  GuestsOption,
  HeadphoneUseOption,
  LifestyleTraitKey,
  NoiseLevelOption,
  PetsOption,
  ProfileBasics,
  ProfileHousing,
  ProfileImportance,
  ProfileLifestyle,
  RoommateCountPref,
  RoommateGenderPref,
  RoommateProfile,
  SleepScheduleOption,
  SmokingOption,
  StudyHabitsOption,
  YesNoOption,
} from '../services/types';
import {
  formatRoommateCountLabel,
  formatTraitAnswer,
  normalizeRoommateCountPref,
} from '../utils/matching';
import { AVATAR_PRESETS, Avatar } from './Avatar';

interface ProfileDataSnapshot {
  basics: ProfileBasics;
  housing: ProfileHousing;
  lifestyle: ProfileLifestyle;
  importance: ProfileImportance;
  dealBreakers: DealBreakerKey[];
}

function toSnapshot(
  source: Pick<
    ProfileDraft,
    'basics' | 'housing' | 'lifestyle' | 'importance' | 'dealBreakers'
  >,
): ProfileDataSnapshot {
  return {
    basics: { ...source.basics },
    housing: { ...source.housing },
    lifestyle: { ...source.lifestyle },
    importance: { ...source.importance },
    dealBreakers: [...source.dealBreakers],
  };
}

function areSnapshotsEqual(a: ProfileDataSnapshot, b: ProfileDataSnapshot): boolean {
  const sameDealBreakers =
    a.dealBreakers.length === b.dealBreakers.length &&
    [...a.dealBreakers].sort().join(',') === [...b.dealBreakers].sort().join(',');
  if (!sameDealBreakers) return false;

  return (
    JSON.stringify(a.basics) === JSON.stringify(b.basics) &&
    JSON.stringify(a.housing) === JSON.stringify(b.housing) &&
    JSON.stringify(a.lifestyle) === JSON.stringify(b.lifestyle) &&
    JSON.stringify(a.importance) === JSON.stringify(b.importance)
  );
}

function formatFriendlySaveError(err: unknown): string {
  if (!(err instanceof Error)) {
    return 'Could not save your profile. Please try again.';
  }
  try {
    const parsed = JSON.parse(err.message) as { error?: string; operationType?: string };
    if (parsed && typeof parsed.error === 'string') {
      if (parsed.error.toLowerCase().includes('permission')) {
        return 'Permission denied while saving your profile. Please sign in again and retry.';
      }
      return parsed.error;
    }
  } catch {
    // Plain error message
  }
  return err.message || 'Could not save your profile. Please try again.';
}

interface ProfileFormWizardProps {
  initialProfile?: RoommateProfile | null;
  mode: 'setup' | 'edit';
  onSaved: (profile: RoommateProfile) => void;
}

const STEP_TITLES = [
  'Basics',
  'Housing',
  'Lifestyle',
  'Importance',
  'Deal-breakers',
  'Review',
];

const GENDER_OPTIONS: Array<{ value: GenderOption; label: string }> = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

const IMPORTANCE_TRAITS: Array<{ key: LifestyleTraitKey; label: string }> = [
  { key: 'smoking', label: 'Smoking habits' },
  { key: 'drinking', label: 'Drinking habits' },
  { key: 'sleepSchedule', label: 'Sleep schedule' },
  { key: 'noiseLevel', label: 'Noise level' },
  { key: 'headphoneUse', label: 'Headphone use' },
  { key: 'cleanliness', label: 'Cleanliness' },
  { key: 'guests', label: 'Guests & visitors' },
  { key: 'studyHabits', label: 'Study habits' },
  { key: 'diet', label: 'Diet preference' },
  { key: 'pets', label: 'Pets' },
  { key: 'roommateCount', label: 'Roommate count' },
];

const ROOMMATE_COUNT_OPTIONS: Array<{ value: RoommateCountPref; label: string }> = [
  { value: 1, label: '1 roommate' },
  { value: 2, label: '2 roommates' },
  { value: 3, label: '3 roommates' },
  { value: 4, label: '4+ roommates' },
  { value: 'flexible', label: 'Flexible (any number)' },
];

const DEAL_BREAKER_OPTIONS: Array<{ key: DealBreakerKey; label: string; hint: string }> = [
  { key: 'smoker', label: 'Smoker', hint: 'Exclude anyone who smokes occasionally or regularly' },
  { key: 'drinker', label: 'Drinker', hint: 'Exclude anyone who drinks socially or regularly' },
  { key: 'loud_noise', label: 'Loud noise', hint: 'Exclude students who prefer a loud home environment' },
  { key: 'night_owl', label: 'Night owl', hint: 'Exclude students who stay awake past 1 AM regularly' },
  { key: 'frequent_guests', label: 'Frequent guests', hint: 'Exclude students who often host visitors' },
  { key: 'non_veg_cooking', label: 'Non-veg cooking', hint: 'Exclude students who follow a non-vegetarian diet' },
  { key: 'pets', label: 'Pets', hint: 'Exclude students who currently have a pet' },
  { key: 'messy_roommate', label: 'Messy roommate', hint: 'Exclude students with cleanliness rating 1 or 2' },
  {
    key: 'different_group_size',
    label: 'Different group size',
    hint: 'Exclude students who prefer a different number of roommates',
  },
];

export function formatINR(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function ProfileFormWizard({ initialProfile, mode, onSaved }: ProfileFormWizardProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { setGuard } = useUnsavedChanges();
  const navigate = useNavigate();

  const [savedBaseline, setSavedBaseline] = useState<ProfileDataSnapshot>(() => {
    if (initialProfile) {
      return toSnapshot({
        basics: initialProfile.basics,
        housing: {
          ...initialProfile.housing,
          roommateCount: normalizeRoommateCountPref(initialProfile.housing.roommateCount),
        },
        lifestyle: initialProfile.lifestyle,
        importance: {
          ...initialProfile.importance,
          roommateCount: initialProfile.importance.roommateCount ?? 3,
        },
        dealBreakers: initialProfile.dealBreakers,
      });
    }
    return toSnapshot(
      createDefaultProfileDraft({
        name: user?.name || '',
        college: user?.college || '',
        city: user?.city || '',
      }),
    );
  });

  const [draft, setDraft] = useState<ProfileDraft>(() => {
    if (user) {
      const savedDraft = loadProfileDraft(user.uid);
      if (savedDraft) {
        return savedDraft;
      }
    }
    if (initialProfile) {
      return {
        step: 1,
        basics: { ...initialProfile.basics },
        housing: {
          ...initialProfile.housing,
          roommateCount: normalizeRoommateCountPref(initialProfile.housing.roommateCount),
        },
        lifestyle: { ...initialProfile.lifestyle },
        importance: {
          ...initialProfile.importance,
          roommateCount: initialProfile.importance.roommateCount ?? 3,
        },
        dealBreakers: [...initialProfile.dealBreakers],
        savedAt: initialProfile.updatedAt,
      };
    }
    return createDefaultProfileDraft({
      name: user?.name || '',
      college: user?.college || '',
      city: user?.city || '',
    });
  });

  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  const hasChanges = useMemo(() => {
    if (mode !== 'edit') return false;
    return !areSnapshotsEqual(toSnapshot(draft), savedBaseline);
  }, [draft, mode, savedBaseline]);

  // Autosave draft whenever form state changes (and clear edit draft when reverted cleanly)
  useEffect(() => {
    if (!user?.uid) return;
    if (mode === 'edit' && !hasChanges) {
      clearProfileDraft(user.uid);
      return;
    }
    saveProfileDraft(user.uid, draft);
  }, [draft, hasChanges, mode, user?.uid]);

  // Register navigation / unload guard when edit mode has unsaved changes
  useEffect(() => {
    if (mode !== 'edit' || !hasChanges) {
      setGuard(null);
      return;
    }
    setGuard({
      isDirty: true,
      onDiscard: () => {
        if (user?.uid) {
          clearProfileDraft(user.uid);
        }
      },
    });
    return () => setGuard(null);
  }, [hasChanges, mode, setGuard, user?.uid]);

  // Keep fixed edit bar above mobile soft keyboard via visualViewport
  useEffect(() => {
    if (mode !== 'edit' || typeof window === 'undefined' || !window.visualViewport) {
      return;
    }
    const vv = window.visualViewport;
    const updateOffset = () => {
      const offset = Math.max(0, window.innerHeight - (vv.offsetTop + vv.height));
      setKeyboardOffset(offset);
    };
    updateOffset();
    vv.addEventListener('resize', updateOffset);
    vv.addEventListener('scroll', updateOffset);
    return () => {
      vv.removeEventListener('resize', updateOffset);
      vv.removeEventListener('scroll', updateOffset);
    };
  }, [mode]);

  const step = draft.step;

  const validateStep = (targetStep: number): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (targetStep === 1) {
      if (!draft.basics.name.trim() || draft.basics.name.trim().length < 2) {
        errs.name = 'Please enter your name (at least 2 characters)';
      }
      if (!Number.isFinite(draft.basics.age) || draft.basics.age < 17 || draft.basics.age > 35) {
        errs.age = 'Age must be between 17 and 35';
      }
      if (!['male', 'female', 'other', 'prefer_not_to_say'].includes(draft.basics.gender)) {
        errs.gender = 'Gender selection is required';
      }
      if (!draft.basics.college.trim() || draft.basics.college.trim().length < 2) {
        errs.college = 'Please enter your college name';
      }
      if (!draft.basics.courseYear.trim() || draft.basics.courseYear.trim().length < 2) {
        errs.courseYear = 'Please enter your course and year';
      }
      if (draft.basics.bio.length > 200) {
        errs.bio = 'Bio must be 200 characters or fewer';
      }
    }

    if (targetStep === 2) {
      if (draft.housing.budgetMin < 2000 || draft.housing.budgetMax > 40000) {
        errs.budget = 'Budget must be between ₹2,000 and ₹40,000';
      } else if (draft.housing.budgetMin > draft.housing.budgetMax) {
        errs.budget = 'Minimum budget cannot exceed maximum budget';
      }
      if (!draft.housing.preferredCity.trim() || draft.housing.preferredCity.trim().length < 2) {
        errs.preferredCity = 'Please enter your preferred city';
      }
      if (!draft.housing.preferredArea.trim()) {
        errs.preferredArea = 'Please enter a preferred neighborhood or campus area';
      }
      if (!draft.housing.moveInDate) {
        errs.moveInDate = 'Please select your target move-in date';
      }
      if (!['any', 'same_gender'].includes(draft.housing.roommateGenderPref)) {
        errs.roommateGenderPref = 'Roommate gender preference is required';
      }
      if (![1, 2, 3, 4, 'flexible'].includes(draft.housing.roommateCount)) {
        errs.roommateCount = 'Please choose how many roommates you prefer';
      }
    }

    if (targetStep === 3) {
      if (!['never', 'occasionally', 'regularly'].includes(draft.lifestyle.smoking)) {
        errs.smoking = 'Smoking selection is required';
      }
      if (!['yes', 'no'].includes(draft.lifestyle.okayWithSmoker)) {
        errs.okayWithSmoker = 'Smoker preference is required';
      }
      if (!['never', 'socially', 'regularly'].includes(draft.lifestyle.drinking)) {
        errs.drinking = 'Drinking selection is required';
      }
      if (!['yes', 'no'].includes(draft.lifestyle.okayWithDrinker)) {
        errs.okayWithDrinker = 'Drinker preference is required';
      }
      if (!['early_bird', 'flexible', 'night_owl'].includes(draft.lifestyle.sleepSchedule)) {
        errs.sleepSchedule = 'Sleep schedule is required';
      }
      if (!['quiet', 'moderate', 'loud'].includes(draft.lifestyle.noiseLevel)) {
        errs.noiseLevel = 'Noise level is required';
      }
      if (!['always', 'sometimes', 'never'].includes(draft.lifestyle.headphoneUse)) {
        errs.headphoneUse = 'Headphone use is required';
      }
      if (
        !Number.isInteger(draft.lifestyle.cleanliness) ||
        draft.lifestyle.cleanliness < 1 ||
        draft.lifestyle.cleanliness > 5
      ) {
        errs.cleanliness = 'Cleanliness rating is required';
      }
      if (!['never', 'sometimes', 'often'].includes(draft.lifestyle.guests)) {
        errs.guests = 'Guests preference is required';
      }
      if (!['silence', 'background_noise', 'outside'].includes(draft.lifestyle.studyHabits)) {
        errs.studyHabits = 'Study habits selection is required';
      }
      if (!['vegetarian', 'eggetarian', 'non_vegetarian'].includes(draft.lifestyle.diet)) {
        errs.diet = 'Diet selection is required';
      }
      if (!['yes', 'no'].includes(draft.lifestyle.okayWithNonVegCooking)) {
        errs.okayWithNonVegCooking = 'Non-veg cooking preference is required';
      }
      if (!['has_pet', 'likes_pets', 'dislikes_allergic'].includes(draft.lifestyle.pets)) {
        errs.pets = 'Pets preference is required';
      }
    }

    if (targetStep === 4) {
      const invalidTrait = IMPORTANCE_TRAITS.find((item) => {
        const val = draft.importance[item.key];
        return !Number.isInteger(val) || val < 1 || val > 5;
      });
      if (invalidTrait) {
        errs.importance = `${invalidTrait.label} importance must be between 1 and 5`;
      }
    }

    if (targetStep === 5) {
      if (!Array.isArray(draft.dealBreakers)) {
        errs.dealBreakers = 'Deal-breakers selection is invalid';
      }
    }

    return errs;
  };

  const goToStep = (nextStep: number) => {
    if (mode === 'setup' && nextStep > step) {
      const errs = validateStep(step);
      setStepErrors(errs);
      if (Object.keys(errs).length > 0) return;
    } else if (mode === 'edit' && nextStep > step) {
      const errs = validateStep(step);
      setStepErrors(errs);
      if (Object.keys(errs).length > 0) return;
    } else {
      setStepErrors({});
    }
    setDraft((prev) => ({ ...prev, step: Math.min(6, Math.max(1, nextStep)) }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = async () => {
    if (!user || saving) return;

    for (const targetStep of [1, 2, 3, 4, 5]) {
      const errs = validateStep(targetStep);
      if (Object.keys(errs).length > 0) {
        const firstMsg = Object.values(errs)[0];
        const bannerMsg = `Please fix Step ${targetStep}: ${firstMsg}`;
        setStepErrors(errs);
        setSubmitError(bannerMsg);
        setDraft((prev) => ({ ...prev, step: targetStep }));
        showToast(bannerMsg, 'error');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }

    setStepErrors({});
    setSaving(true);
    setSubmitError('');

    const payloadToSave = {
      basics: draft.basics,
      housing: draft.housing,
      lifestyle: draft.lifestyle,
      importance: draft.importance,
      dealBreakers: draft.dealBreakers,
      isComplete: true,
    };

    try {
      const saved = await saveProfile(user.uid, payloadToSave);
      setSavedBaseline(toSnapshot(saved));
      clearProfileDraft(user.uid);
      showToast(
        mode === 'setup' ? 'Profile saved! Here are your roommate matches.' : 'Profile updated',
        'success',
      );
      onSaved(saved);
    } catch (err) {
      console.error('Profile save failed:', {
        path: `profiles/${user.uid}`,
        payload: payloadToSave,
        error: err,
      });
      const message = formatFriendlySaveError(err);
      setSubmitError(message);
      showToast(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelClick = () => {
    if (saving) return;
    if (hasChanges) {
      setCancelDialogOpen(true);
      return;
    }
    navigate('/dashboard');
  };

  const handleConfirmDiscard = () => {
    setCancelDialogOpen(false);
    if (user?.uid) {
      clearProfileDraft(user.uid);
    }
    setStepErrors({});
    setSubmitError('');
    setDraft((prev) => ({
      ...prev,
      basics: { ...savedBaseline.basics },
      housing: { ...savedBaseline.housing },
      lifestyle: { ...savedBaseline.lifestyle },
      importance: { ...savedBaseline.importance },
      dealBreakers: [...savedBaseline.dealBreakers],
      savedAt: new Date().toISOString(),
    }));
    showToast('Unsaved changes discarded.', 'info');
  };

  const renderChoiceGroup = <T extends string | number>(
    label: string,
    value: T,
    options: Array<{ value: T; label: string }>,
    onChange: (val: T) => void,
    errorText?: string,
  ) => (
    <div className="space-y-2.5">
      <p className="text-sm font-semibold text-indigo-950 dark:text-slate-100">{label}</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={String(opt.value)}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`min-h-[44px] px-3.5 py-2.5 rounded-xl border text-left text-sm font-medium transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                active
                  ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-950/70 text-indigo-950 dark:text-indigo-100 font-semibold shadow-xs'
                  : 'border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-950/60 text-stone-700 dark:text-slate-200 hover:border-stone-300 dark:hover:border-slate-600 hover:bg-stone-50 dark:hover:bg-slate-800'
              }`}
            >
              <span>{opt.label}</span>
              {active && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
      {errorText && (
        <p role="alert" className="text-xs font-medium text-rose-700 dark:text-rose-400">
          {errorText}
        </p>
      )}
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between gap-4 mb-2">
          <p className="text-xs sm:text-sm font-semibold text-indigo-700 dark:text-indigo-400 tabular-nums">
            Step {step} of 6 · {STEP_TITLES[step - 1]}
          </p>
          <div className="flex items-center gap-2.5">
            {mode === 'edit' && hasChanges && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-500" aria-hidden="true" />
                <span>Unsaved changes</span>
              </span>
            )}
            <p className="text-xs text-stone-500 dark:text-slate-400">Draft autosaved</p>
          </div>
        </div>
        <div className="w-full h-2 bg-stone-200 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-600 rounded-full transition-all duration-300"
            style={{ width: `${(step / 6) * 100}%` }}
          />
        </div>
        <div className="hidden sm:grid grid-cols-6 gap-2 mt-2.5">
          {STEP_TITLES.map((title, idx) => {
            const num = idx + 1;
            const isCurrent = num === step;
            const isClickable = mode === 'edit' ? num !== step : num < step;
            return (
              <button
                key={title}
                type="button"
                onClick={() => (isClickable ? goToStep(num) : undefined)}
                disabled={mode === 'setup' && num > step}
                className={`text-left text-xs font-medium truncate py-1 ${
                  isCurrent
                    ? 'text-indigo-700 dark:text-indigo-400 font-semibold'
                    : isClickable
                      ? 'text-stone-700 dark:text-slate-300 hover:text-indigo-700 dark:hover:text-indigo-300 cursor-pointer'
                      : 'text-stone-400 dark:text-slate-600 cursor-default'
                }`}
              >
                {num}. {title}
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-[0_2px_18px_-4px_rgba(26,25,43,0.08)] dark:shadow-none">
        {submitError && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 px-4 py-3 text-sm text-rose-800 dark:text-rose-200"
          >
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{submitError}</span>
          </div>
        )}

        {/* STEP 1: BASICS */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="font-display text-xl font-bold text-indigo-950 dark:text-slate-100">Basic details</h2>
              <p className="text-sm text-stone-600 dark:text-slate-300 mt-1">
                Tell fellow students a bit about who you are. Email is never shown publicly.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="prof-name" className="block text-sm font-medium text-stone-800 dark:text-slate-200 mb-1.5">
                  Display name
                </label>
                <input
                  id="prof-name"
                  type="text"
                  maxLength={80}
                  value={draft.basics.name}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, basics: { ...p.basics, name: e.target.value } }))
                  }
                  className="w-full min-h-[44px] rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-stone-900 dark:text-slate-100 placeholder:text-stone-400 dark:placeholder:text-slate-500 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                />
                {stepErrors.name && (
                  <p role="alert" className="mt-1 text-xs font-medium text-rose-700 dark:text-rose-400">
                    {stepErrors.name}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="prof-age" className="block text-sm font-medium text-stone-800 dark:text-slate-200 mb-1.5">
                  Age (17–35)
                </label>
                <input
                  id="prof-age"
                  type="number"
                  min={17}
                  max={35}
                  value={draft.basics.age}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      basics: { ...p.basics, age: Number(e.target.value) || 17 },
                    }))
                  }
                  className="w-full min-h-[44px] rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-stone-900 dark:text-slate-100 px-3.5 py-2.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                />
                {stepErrors.age && (
                  <p role="alert" className="mt-1 text-xs font-medium text-rose-700 dark:text-rose-400">
                    {stepErrors.age}
                  </p>
                )}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-stone-800 dark:text-slate-200 mb-2">Gender</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {GENDER_OPTIONS.map((opt) => {
                  const active = draft.basics.gender === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        setDraft((p) => ({ ...p, basics: { ...p.basics, gender: opt.value } }))
                      }
                      className={`min-h-[44px] px-3 py-2 rounded-xl border text-sm font-medium transition-colors cursor-pointer ${
                        active
                          ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-950/70 text-indigo-950 dark:text-indigo-100 font-semibold'
                          : 'border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-950/60 text-stone-700 dark:text-slate-200 hover:bg-stone-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              {stepErrors.gender && (
                <p role="alert" className="mt-1.5 text-xs font-medium text-rose-700 dark:text-rose-400">
                  {stepErrors.gender}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="prof-college" className="block text-sm font-medium text-stone-800 dark:text-slate-200 mb-1.5">
                  College / University
                </label>
                <input
                  id="prof-college"
                  type="text"
                  maxLength={120}
                  value={draft.basics.college}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, basics: { ...p.basics, college: e.target.value } }))
                  }
                  placeholder="e.g., IIT Indore"
                  className="w-full min-h-[44px] rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-stone-900 dark:text-slate-100 placeholder:text-stone-400 dark:placeholder:text-slate-500 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                />
                {stepErrors.college && (
                  <p role="alert" className="mt-1 text-xs font-medium text-rose-700 dark:text-rose-400">
                    {stepErrors.college}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="prof-course" className="block text-sm font-medium text-stone-800 dark:text-slate-200 mb-1.5">
                  Course & year
                </label>
                <input
                  id="prof-course"
                  type="text"
                  maxLength={80}
                  value={draft.basics.courseYear}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      basics: { ...p.basics, courseYear: e.target.value },
                    }))
                  }
                  placeholder="e.g., B.Tech CSE · 3rd Year"
                  className="w-full min-h-[44px] rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-stone-900 dark:text-slate-100 placeholder:text-stone-400 dark:placeholder:text-slate-500 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                />
                {stepErrors.courseYear && (
                  <p role="alert" className="mt-1 text-xs font-medium text-rose-700 dark:text-rose-400">
                    {stepErrors.courseYear}
                  </p>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="prof-bio" className="block text-sm font-medium text-stone-800 dark:text-slate-200">
                  Short bio
                </label>
                <span className="text-xs text-stone-500 dark:text-slate-400 tabular-nums">
                  {draft.basics.bio.length} / 200
                </span>
              </div>
              <textarea
                id="prof-bio"
                rows={3}
                maxLength={200}
                value={draft.basics.bio}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, basics: { ...p.basics, bio: e.target.value } }))
                }
                placeholder="Share your hobbies, daily routine, and what kind of flatmate vibe you are looking for..."
                className="w-full rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-stone-900 dark:text-slate-100 placeholder:text-stone-400 dark:placeholder:text-slate-500 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
              />
              {stepErrors.bio && (
                <p role="alert" className="mt-1 text-xs font-medium text-rose-700 dark:text-rose-400">
                  {stepErrors.bio}
                </p>
              )}
            </div>

            <div>
              <p className="text-sm font-medium text-stone-800 dark:text-slate-200 mb-2.5">Choose an avatar</p>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setDraft((p) => ({ ...p, basics: { ...p.basics, avatar: 'initials' } }))
                  }
                  className={`p-1.5 rounded-2xl border-2 transition-colors cursor-pointer ${
                    draft.basics.avatar === 'initials'
                      ? 'border-indigo-600 dark:border-indigo-400 bg-indigo-50/40 dark:bg-indigo-950/50'
                      : 'border-transparent hover:border-stone-200 dark:hover:border-slate-700'
                  }`}
                  title="Use initials"
                >
                  <Avatar name={draft.basics.name || 'You'} avatar="initials" size="md" />
                </button>
                {AVATAR_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() =>
                      setDraft((p) => ({ ...p, basics: { ...p.basics, avatar: preset.id } }))
                    }
                    className={`p-1.5 rounded-2xl border-2 transition-colors cursor-pointer ${
                      draft.basics.avatar === preset.id
                        ? 'border-indigo-600 dark:border-indigo-400 bg-indigo-50/40 dark:bg-indigo-950/50'
                        : 'border-transparent hover:border-stone-200 dark:hover:border-slate-700'
                    }`}
                    title={preset.label}
                  >
                    <Avatar name={draft.basics.name || 'You'} avatar={preset.id} size="md" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: HOUSING */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="font-display text-xl font-bold text-indigo-950 dark:text-slate-100">Housing preferences</h2>
              <p className="text-sm text-stone-600 dark:text-slate-300 mt-1">
                We only match you with students whose monthly budget overlaps with yours.
              </p>
            </div>

            <div className="rounded-2xl bg-[#f8f7f4] dark:bg-slate-800/70 p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-semibold text-indigo-950 dark:text-slate-100">Monthly rent budget (INR)</p>
                <p className="text-sm font-bold text-indigo-700 dark:text-indigo-400 tabular-nums">
                  {formatINR(draft.housing.budgetMin)} – {formatINR(draft.housing.budgetMax)}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="budget-min" className="block text-xs font-medium text-stone-600 dark:text-slate-300 mb-1">
                    Minimum ({formatINR(draft.housing.budgetMin)})
                  </label>
                  <input
                    id="budget-min"
                    type="range"
                    min={2000}
                    max={40000}
                    step={500}
                    value={draft.housing.budgetMin}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setDraft((p) => ({
                        ...p,
                        housing: {
                          ...p.housing,
                          budgetMin: val,
                          budgetMax: Math.max(val, p.housing.budgetMax),
                        },
                      }));
                    }}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>
                <div>
                  <label htmlFor="budget-max" className="block text-xs font-medium text-stone-600 dark:text-slate-300 mb-1">
                    Maximum ({formatINR(draft.housing.budgetMax)})
                  </label>
                  <input
                    id="budget-max"
                    type="range"
                    min={2000}
                    max={40000}
                    step={500}
                    value={draft.housing.budgetMax}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setDraft((p) => ({
                        ...p,
                        housing: {
                          ...p.housing,
                          budgetMax: val,
                          budgetMin: Math.min(val, p.housing.budgetMin),
                        },
                      }));
                    }}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>
              </div>
              {stepErrors.budget && (
                <p role="alert" className="text-xs font-medium text-rose-700 dark:text-rose-400">
                  {stepErrors.budget}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="prof-city" className="block text-sm font-medium text-stone-800 dark:text-slate-200 mb-1.5">
                  Preferred city
                </label>
                <input
                  id="prof-city"
                  type="text"
                  maxLength={80}
                  value={draft.housing.preferredCity}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      housing: { ...p.housing, preferredCity: e.target.value },
                    }))
                  }
                  placeholder="e.g., Indore, Pune, Bengaluru"
                  className="w-full min-h-[44px] rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-stone-900 dark:text-slate-100 placeholder:text-stone-400 dark:placeholder:text-slate-500 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                />
                {stepErrors.preferredCity && (
                  <p role="alert" className="mt-1 text-xs font-medium text-rose-700 dark:text-rose-400">
                    {stepErrors.preferredCity}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="prof-area" className="block text-sm font-medium text-stone-800 dark:text-slate-200 mb-1.5">
                  Preferred area / locality
                </label>
                <input
                  id="prof-area"
                  type="text"
                  maxLength={120}
                  value={draft.housing.preferredArea}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      housing: { ...p.housing, preferredArea: e.target.value },
                    }))
                  }
                  placeholder="e.g., Vijay Nagar / Bhawarkua"
                  className="w-full min-h-[44px] rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-stone-900 dark:text-slate-100 placeholder:text-stone-400 dark:placeholder:text-slate-500 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                />
                {stepErrors.preferredArea && (
                  <p role="alert" className="mt-1 text-xs font-medium text-rose-700 dark:text-rose-400">
                    {stepErrors.preferredArea}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="prof-movein" className="block text-sm font-medium text-stone-800 dark:text-slate-200 mb-1.5">
                  Target move-in date
                </label>
                <input
                  id="prof-movein"
                  type="date"
                  value={draft.housing.moveInDate}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      housing: { ...p.housing, moveInDate: e.target.value },
                    }))
                  }
                  className="w-full min-h-[44px] rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-stone-900 dark:text-slate-100 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                />
                {stepErrors.moveInDate && (
                  <p role="alert" className="mt-1 text-xs font-medium text-rose-700 dark:text-rose-400">
                    {stepErrors.moveInDate}
                  </p>
                )}
              </div>

              <div>
                <p className="text-sm font-medium text-stone-800 dark:text-slate-200 mb-1.5">Roommate gender preference</p>
                <div className="grid grid-cols-2 gap-2.5">
                  {(
                    [
                      { value: 'any', label: 'Any gender' },
                      { value: 'same_gender', label: 'Same gender only' },
                    ] as Array<{ value: RoommateGenderPref; label: string }>
                  ).map((opt) => {
                    const active = draft.housing.roommateGenderPref === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() =>
                          setDraft((p) => ({
                            ...p,
                            housing: { ...p.housing, roommateGenderPref: opt.value },
                          }))
                        }
                        className={`min-h-[44px] px-3 py-2 rounded-xl border text-sm font-medium transition-colors cursor-pointer ${
                          active
                            ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-950/70 text-indigo-950 dark:text-indigo-100 font-semibold'
                            : 'border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-950/60 text-stone-700 dark:text-slate-200 hover:bg-stone-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                {stepErrors.roommateGenderPref && (
                  <p role="alert" className="mt-1.5 text-xs font-medium text-rose-700 dark:text-rose-400">
                    {stepErrors.roommateGenderPref}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2.5">
              <p className="text-sm font-medium text-stone-800 dark:text-slate-200">
                How many roommates are you comfortable sharing a room/flat with?
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {ROOMMATE_COUNT_OPTIONS.map((opt) => {
                  const active = draft.housing.roommateCount === opt.value;
                  return (
                    <button
                      key={String(opt.value)}
                      type="button"
                      onClick={() =>
                        setDraft((p) => ({
                          ...p,
                          housing: { ...p.housing, roommateCount: opt.value },
                        }))
                      }
                      className={`min-h-[44px] px-3.5 py-2.5 rounded-xl border text-left text-sm font-medium transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                        opt.value === 'flexible' ? 'col-span-2 sm:col-span-2' : ''
                      } ${
                        active
                          ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-950/70 text-indigo-950 dark:text-indigo-100 font-semibold shadow-xs'
                          : 'border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-950/60 text-stone-700 dark:text-slate-200 hover:border-stone-300 dark:hover:border-slate-600 hover:bg-stone-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {active && (
                        <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" aria-hidden="true" />
                      )}
                    </button>
                  );
                })}
              </div>
              {stepErrors.roommateCount && (
                <p role="alert" className="text-xs font-medium text-rose-700 dark:text-rose-400">
                  {stepErrors.roommateCount}
                </p>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: LIFESTYLE */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-xl font-bold text-indigo-950 dark:text-slate-100">Daily lifestyle habits</h2>
              <p className="text-sm text-stone-600 dark:text-slate-300 mt-1">
                Answer honestly—matching works best when everyone shares their real routine.
              </p>
            </div>

            {renderChoiceGroup<SmokingOption>(
              'Smoking',
              draft.lifestyle.smoking,
              [
                { value: 'never', label: 'Never' },
                { value: 'occasionally', label: 'Occasionally' },
                { value: 'regularly', label: 'Regularly' },
              ],
              (val) => setDraft((p) => ({ ...p, lifestyle: { ...p.lifestyle, smoking: val } })),
              stepErrors.smoking,
            )}

            {renderChoiceGroup<YesNoOption>(
              'Okay with a smoker roommate?',
              draft.lifestyle.okayWithSmoker,
              [
                { value: 'yes', label: 'Yes' },
                { value: 'no', label: 'No' },
              ],
              (val) =>
                setDraft((p) => ({ ...p, lifestyle: { ...p.lifestyle, okayWithSmoker: val } })),
              stepErrors.okayWithSmoker,
            )}

            {renderChoiceGroup<DrinkingOption>(
              'Drinking',
              draft.lifestyle.drinking,
              [
                { value: 'never', label: 'Never' },
                { value: 'socially', label: 'Socially' },
                { value: 'regularly', label: 'Regularly' },
              ],
              (val) => setDraft((p) => ({ ...p, lifestyle: { ...p.lifestyle, drinking: val } })),
              stepErrors.drinking,
            )}

            {renderChoiceGroup<YesNoOption>(
              'Okay with a drinker roommate?',
              draft.lifestyle.okayWithDrinker,
              [
                { value: 'yes', label: 'Yes' },
                { value: 'no', label: 'No' },
              ],
              (val) =>
                setDraft((p) => ({ ...p, lifestyle: { ...p.lifestyle, okayWithDrinker: val } })),
              stepErrors.okayWithDrinker,
            )}

            {renderChoiceGroup<SleepScheduleOption>(
              'Sleep schedule',
              draft.lifestyle.sleepSchedule,
              [
                { value: 'early_bird', label: 'Early bird (before 10pm)' },
                { value: 'flexible', label: 'Flexible' },
                { value: 'night_owl', label: 'Night owl (after 1am)' },
              ],
              (val) =>
                setDraft((p) => ({ ...p, lifestyle: { ...p.lifestyle, sleepSchedule: val } })),
              stepErrors.sleepSchedule,
            )}

            {renderChoiceGroup<NoiseLevelOption>(
              'Noise level',
              draft.lifestyle.noiseLevel,
              [
                { value: 'quiet', label: 'Quiet' },
                { value: 'moderate', label: 'Moderate' },
                { value: 'loud', label: 'Loud' },
              ],
              (val) => setDraft((p) => ({ ...p, lifestyle: { ...p.lifestyle, noiseLevel: val } })),
              stepErrors.noiseLevel,
            )}

            {renderChoiceGroup<HeadphoneUseOption>(
              'Headphone use for music / calls',
              draft.lifestyle.headphoneUse,
              [
                { value: 'always', label: 'Always' },
                { value: 'sometimes', label: 'Sometimes' },
                { value: 'never', label: 'Never' },
              ],
              (val) =>
                setDraft((p) => ({ ...p, lifestyle: { ...p.lifestyle, headphoneUse: val } })),
              stepErrors.headphoneUse,
            )}

            <div className="space-y-2.5">
              <p className="text-sm font-semibold text-indigo-950 dark:text-slate-100">Cleanliness (1 = relaxed, 5 = spotless)</p>
              <div className="grid grid-cols-5 gap-2.5">
                {([1, 2, 3, 4, 5] as CleanlinessLevel[]).map((level) => {
                  const active = draft.lifestyle.cleanliness === level;
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() =>
                        setDraft((p) => ({
                          ...p,
                          lifestyle: { ...p.lifestyle, cleanliness: level },
                        }))
                      }
                      className={`min-h-[44px] rounded-xl border text-sm font-semibold tabular-nums transition-colors cursor-pointer ${
                        active
                          ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-950/70 text-indigo-950 dark:text-indigo-100'
                          : 'border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-950/60 text-stone-700 dark:text-slate-200 hover:bg-stone-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {level}
                    </button>
                  );
                })}
              </div>
              {stepErrors.cleanliness && (
                <p role="alert" className="text-xs font-medium text-rose-700 dark:text-rose-400">
                  {stepErrors.cleanliness}
                </p>
              )}
            </div>

            {renderChoiceGroup<GuestsOption>(
              'Guests / visitors',
              draft.lifestyle.guests,
              [
                { value: 'never', label: 'Never' },
                { value: 'sometimes', label: 'Sometimes' },
                { value: 'often', label: 'Often' },
              ],
              (val) => setDraft((p) => ({ ...p, lifestyle: { ...p.lifestyle, guests: val } })),
              stepErrors.guests,
            )}

            {renderChoiceGroup<StudyHabitsOption>(
              'Study habits',
              draft.lifestyle.studyHabits,
              [
                { value: 'silence', label: 'Silence at home' },
                { value: 'background_noise', label: 'Background noise' },
                { value: 'outside', label: 'Mostly outside' },
              ],
              (val) =>
                setDraft((p) => ({ ...p, lifestyle: { ...p.lifestyle, studyHabits: val } })),
              stepErrors.studyHabits,
            )}

            {renderChoiceGroup<DietOption>(
              'Diet',
              draft.lifestyle.diet,
              [
                { value: 'vegetarian', label: 'Vegetarian' },
                { value: 'eggetarian', label: 'Eggetarian' },
                { value: 'non_vegetarian', label: 'Non-vegetarian' },
              ],
              (val) => setDraft((p) => ({ ...p, lifestyle: { ...p.lifestyle, diet: val } })),
              stepErrors.diet,
            )}

            {renderChoiceGroup<YesNoOption>(
              'Okay with non-veg cooking in shared kitchen?',
              draft.lifestyle.okayWithNonVegCooking,
              [
                { value: 'yes', label: 'Yes' },
                { value: 'no', label: 'No' },
              ],
              (val) =>
                setDraft((p) => ({
                  ...p,
                  lifestyle: { ...p.lifestyle, okayWithNonVegCooking: val },
                })),
              stepErrors.okayWithNonVegCooking,
            )}

            {renderChoiceGroup<PetsOption>(
              'Pets',
              draft.lifestyle.pets,
              [
                { value: 'has_pet', label: 'Has pet' },
                { value: 'likes_pets', label: 'Likes pets' },
                { value: 'dislikes_allergic', label: 'Dislikes or allergic' },
              ],
              (val) => setDraft((p) => ({ ...p, lifestyle: { ...p.lifestyle, pets: val } })),
              stepErrors.pets,
            )}
          </div>
        )}

        {/* STEP 4: IMPORTANCE */}
        {step === 4 && (
          <div className="space-y-5">
            <div>
              <h2 className="font-display text-xl font-bold text-indigo-950 dark:text-slate-100">Trait importance</h2>
              <p className="text-sm text-stone-600 dark:text-slate-300 mt-1">
                Higher importance means this trait affects your match score more.
              </p>
            </div>

            <div className="divide-y divide-stone-200/80 dark:divide-slate-800">
              {IMPORTANCE_TRAITS.map((item) => {
                const weight = draft.importance[item.key];
                return (
                  <div
                    key={item.key}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-indigo-950 dark:text-slate-100">{item.label}</p>
                      <p className="text-xs text-stone-500 dark:text-slate-400">
                        Your answer:{' '}
                        {formatTraitAnswer(
                          item.key,
                          item.key === 'roommateCount'
                            ? draft.housing.roommateCount
                            : draft.lifestyle[item.key],
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {([1, 2, 3, 4, 5] as const).map((level) => (
                        <button
                          key={level}
                          type="button"
                          onClick={() =>
                            setDraft((p) => ({
                              ...p,
                              importance: { ...p.importance, [item.key]: level },
                            }))
                          }
                          aria-label={`${item.label} importance ${level} of 5`}
                          className={`w-10 h-10 rounded-xl border text-sm font-semibold tabular-nums transition-colors cursor-pointer ${
                            weight === level
                              ? 'border-indigo-600 bg-indigo-600 text-white'
                              : 'border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-950/60 text-stone-700 dark:text-slate-200 hover:bg-stone-50 dark:hover:bg-slate-800'
                          }`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            {stepErrors.importance && (
              <p role="alert" className="text-xs font-medium text-rose-700 dark:text-rose-400">
                {stepErrors.importance}
              </p>
            )}
          </div>
        )}

        {/* STEP 5: DEAL-BREAKERS */}
        {step === 5 && (
          <div className="space-y-5">
            <div>
              <h2 className="font-display text-xl font-bold text-indigo-950 dark:text-slate-100">Deal-breakers</h2>
              <p className="text-sm text-stone-600 dark:text-slate-300 mt-1">
                People who break these will never appear in your matches.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DEAL_BREAKER_OPTIONS.map((opt) => {
                const checked = draft.dealBreakers.includes(opt.key);
                return (
                  <label
                    key={opt.key}
                    className={`flex items-start gap-3 rounded-2xl border p-4 cursor-pointer transition-colors ${
                      checked
                        ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/60'
                        : 'border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-950/60 hover:bg-stone-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        setDraft((p) => ({
                          ...p,
                          dealBreakers: checked
                            ? p.dealBreakers.filter((k) => k !== opt.key)
                            : [...p.dealBreakers, opt.key],
                        }));
                      }}
                      className="mt-1 w-4 h-4 accent-indigo-600 shrink-0"
                    />
                    <div>
                      <p className="text-sm font-semibold text-indigo-950 dark:text-slate-100">{opt.label}</p>
                      <p className="text-xs text-stone-600 dark:text-slate-300 mt-0.5 leading-relaxed">{opt.hint}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 6: REVIEW */}
        {step === 6 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-xl font-bold text-indigo-950 dark:text-slate-100">Review your profile</h2>
              <p className="text-sm text-stone-600 dark:text-slate-300 mt-1">
                Check everything looks right before saving. You can edit any section anytime.
              </p>
            </div>

            {/* Basics summary */}
            <section className="rounded-2xl bg-[#f8f7f4] dark:bg-slate-800/70 p-5">
              <div className="flex items-center justify-between gap-4 mb-3">
                <h3 className="font-display text-base font-bold text-indigo-950 dark:text-slate-100">1. Basics</h3>
                <button
                  type="button"
                  onClick={() => goToStep(1)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Edit</span>
                </button>
              </div>
              <div className="flex items-start gap-4">
                <Avatar name={draft.basics.name} avatar={draft.basics.avatar} size="lg" />
                <div className="space-y-1 text-sm">
                  <p className="font-semibold text-stone-900 dark:text-slate-100">
                    {draft.basics.name}, {draft.basics.age}
                  </p>
                  <p className="text-stone-600 dark:text-slate-300">
                    {draft.basics.college} · {draft.basics.courseYear}
                  </p>
                  {draft.basics.bio && (
                    <p className="text-stone-600 dark:text-slate-300 pt-1 leading-relaxed">{draft.basics.bio}</p>
                  )}
                </div>
              </div>
            </section>

            {/* Housing summary */}
            <section className="rounded-2xl bg-[#f8f7f4] dark:bg-slate-800/70 p-5">
              <div className="flex items-center justify-between gap-4 mb-3">
                <h3 className="font-display text-base font-bold text-indigo-950 dark:text-slate-100">2. Housing</h3>
                <button
                  type="button"
                  onClick={() => goToStep(2)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Edit</span>
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-stone-500 dark:text-slate-400 block text-xs">Monthly budget</span>
                  <span className="font-semibold text-stone-900 dark:text-slate-100 tabular-nums">
                    {formatINR(draft.housing.budgetMin)} – {formatINR(draft.housing.budgetMax)}
                  </span>
                </div>
                <div>
                  <span className="text-stone-500 dark:text-slate-400 block text-xs">Location</span>
                  <span className="font-semibold text-stone-900 dark:text-slate-100">
                    {draft.housing.preferredArea}, {draft.housing.preferredCity}
                  </span>
                </div>
                <div>
                  <span className="text-stone-500 dark:text-slate-400 block text-xs">Move-in date</span>
                  <span className="font-semibold text-stone-900 dark:text-slate-100 tabular-nums">
                    {draft.housing.moveInDate}
                  </span>
                </div>
                <div>
                  <span className="text-stone-500 dark:text-slate-400 block text-xs">Roommate gender preference</span>
                  <span className="font-semibold text-stone-900 dark:text-slate-100">
                    {draft.housing.roommateGenderPref === 'same_gender'
                      ? 'Same gender only'
                      : 'Any gender'}
                  </span>
                </div>
                <div>
                  <span className="text-stone-500 dark:text-slate-400 block text-xs">Roommates preferred</span>
                  <span className="font-semibold text-stone-900 dark:text-slate-100">
                    {formatRoommateCountLabel(draft.housing.roommateCount)}
                  </span>
                </div>
              </div>
            </section>

            {/* Lifestyle + Importance */}
            <section className="rounded-2xl bg-[#f8f7f4] dark:bg-slate-800/70 p-5">
              <div className="flex items-center justify-between gap-4 mb-3">
                <h3 className="font-display text-base font-bold text-indigo-950 dark:text-slate-100">
                  3. Lifestyle & Importance
                </h3>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => goToStep(3)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Edit lifestyle</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => goToStep(4)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Edit weights</span>
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-sm">
                {IMPORTANCE_TRAITS.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 rounded-xl px-3.5 py-2"
                  >
                    <span className="text-stone-600 dark:text-slate-300">{item.label}</span>
                    <span className="font-semibold text-stone-900 dark:text-slate-100 text-right">
                      {formatTraitAnswer(
                        item.key,
                        item.key === 'roommateCount'
                          ? draft.housing.roommateCount
                          : draft.lifestyle[item.key],
                      )}{' '}
                      ·{' '}
                      <span className="text-indigo-700 dark:text-indigo-400 tabular-nums">
                        {draft.importance[item.key]}/5
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Deal-breakers */}
            <section className="rounded-2xl bg-[#f8f7f4] dark:bg-slate-800/70 p-5">
              <div className="flex items-center justify-between gap-4 mb-2">
                <h3 className="font-display text-base font-bold text-indigo-950 dark:text-slate-100">
                  4. Deal-breakers
                </h3>
                <button
                  type="button"
                  onClick={() => goToStep(5)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Edit</span>
                </button>
              </div>
              {draft.dealBreakers.length === 0 ? (
                <p className="text-sm text-stone-600 dark:text-slate-300">No strict deal-breakers selected.</p>
              ) : (
                <p className="text-sm font-medium text-stone-800 dark:text-slate-200">
                  {draft.dealBreakers
                    .map(
                      (key) =>
                        DEAL_BREAKER_OPTIONS.find((opt) => opt.key === key)?.label || key,
                    )
                    .join(' · ')}
                </p>
              )}
            </section>
          </div>
        )}

        {/* Navigation footer buttons */}
        <div className="mt-8 pt-6 border-t border-stone-200/80 dark:border-slate-800 flex items-center justify-between gap-4">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => goToStep(step - 1)}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-stone-700 dark:text-slate-200 hover:bg-stone-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {step < 6 ? (
            <button
              type="button"
              onClick={() => goToStep(step + 1)}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 min-h-[44px] rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
          ) : mode === 'setup' ? (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 min-h-[44px] rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-70 cursor-pointer"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
              <span>{saving ? 'Saving profile...' : 'Save profile'}</span>
            </button>
          ) : (
            <div />
          )}
        </div>
      </div>

      {/* Sticky Save / Cancel bar on every step in edit mode */}
      {mode === 'edit' && (
        <div
          className="fixed inset-x-0 z-40 border-t border-stone-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-[0_-4px_20px_-4px_rgba(26,25,43,0.1)] dark:shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.45)]"
          style={{ bottom: `${keyboardOffset}px` }}
        >
          <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center justify-between gap-3">
            <div className="min-w-0">
              {hasChanges ? (
                <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-amber-700 dark:text-amber-400">
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" aria-hidden="true" />
                  <span className="truncate">Unsaved changes</span>
                </span>
              ) : (
                <span className="text-xs sm:text-sm text-stone-500 dark:text-slate-400 truncate block">
                  No unsaved changes
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={handleCancelClick}
                disabled={saving}
                className="px-4 py-2.5 min-h-[44px] rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-stone-700 dark:text-slate-200 hover:bg-stone-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!hasChanges || saving}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                <span>{saving ? 'Saving...' : 'Save changes'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel confirmation dialog */}
      {cancelDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/45 dark:bg-black/70 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-edit-title"
        >
          <div className="bg-white dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-start gap-3 mb-4">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 shrink-0">
                <AlertTriangle className="w-5 h-5" aria-hidden="true" />
              </span>
              <div>
                <h2 id="cancel-edit-title" className="font-display text-lg font-bold text-indigo-950 dark:text-slate-100">
                  Discard unsaved changes?
                </h2>
                <p className="text-sm text-stone-600 dark:text-slate-300 mt-1 leading-relaxed">
                  You have unsaved edits on your profile. Discarding will revert your changes back
                  to your last saved profile.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setCancelDialogOpen(false)}
                className="px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold text-stone-700 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Keep editing
              </button>
              <button
                type="button"
                onClick={handleConfirmDiscard}
                className="px-5 py-2.5 min-h-[44px] rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 cursor-pointer"
              >
                Discard changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
