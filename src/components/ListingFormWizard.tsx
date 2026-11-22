import {
  AlertCircle,
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Loader2,
  Plus,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';
import {
  clearListingDraft,
  createDefaultListingDraft,
  loadListingDraft,
  saveListing,
  saveListingDraft,
  type ListingDraft,
  type SaveListingInput,
} from '../services/listingService';
import { useToast } from '../services/ToastContext';
import { useUnsavedChanges } from '../services/UnsavedChangesContext';
import type {
  FurnishedStatus,
  Listing,
  ListingAmenity,
  ListingGenderAllowed,
  ListingStatus,
  PropertyType,
} from '../services/types';
import {
  AMENITY_OPTIONS,
  FURNISHED_OPTIONS,
  GENDER_ALLOWED_OPTIONS,
  PROPERTY_TYPE_OPTIONS,
} from '../utils/listingCompatibility';
import { isSafeImageUrl } from '../utils/validation';

interface ListingFormWizardProps {
  mode: 'create' | 'edit';
  initialListing?: Listing | null;
  onSaved: (listing: Listing) => void;
}

const STEP_TITLES = [
  'Property basics',
  'Location & rent',
  'Amenities & rules',
  'Photos & publish',
];

function listingToDraft(listing: Listing): ListingDraft {
  return {
    step: 1,
    title: listing.title,
    propertyType: listing.propertyType,
    address: { ...listing.address },
    nearbyLandmark: listing.nearbyLandmark,
    rentPerMonth: listing.rentPerMonth,
    securityDeposit: listing.securityDeposit,
    totalBeds: listing.totalBeds,
    availableBeds: listing.availableBeds,
    genderAllowed: listing.genderAllowed,
    furnished: listing.furnished,
    availableFrom: listing.availableFrom,
    amenities: [...listing.amenities],
    houseRules: { ...listing.houseRules },
    description: listing.description,
    photoUrls: [...listing.photoUrls],
    authorizedConfirmed: listing.authorizedConfirmed,
    status: listing.status,
    savedAt: listing.updatedAt,
  };
}

function toSnapshot(d: ListingDraft) {
  return {
    title: d.title,
    propertyType: d.propertyType,
    address: { ...d.address },
    nearbyLandmark: d.nearbyLandmark,
    rentPerMonth: d.rentPerMonth,
    securityDeposit: d.securityDeposit,
    totalBeds: d.totalBeds,
    availableBeds: d.availableBeds,
    genderAllowed: d.genderAllowed,
    furnished: d.furnished,
    availableFrom: d.availableFrom,
    amenities: [...d.amenities].sort(),
    houseRules: { ...d.houseRules },
    description: d.description,
    photoUrls: [...d.photoUrls],
    authorizedConfirmed: d.authorizedConfirmed,
    status: d.status,
  };
}

export function ListingFormWizard({ mode, initialListing, onSaved }: ListingFormWizardProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { setGuard } = useUnsavedChanges();
  const navigate = useNavigate();

  const initialDraft = useMemo<ListingDraft>(() => {
    if (mode === 'edit' && initialListing) {
      return listingToDraft(initialListing);
    }
    if (user?.uid) {
      const saved = loadListingDraft(user.uid);
      if (saved) return saved;
    }
    return createDefaultListingDraft(user?.city || '');
  }, [mode, initialListing, user?.uid, user?.city]);

  const [draft, setDraft] = useState<ListingDraft>(initialDraft);
  const [baselineSnapshot, setBaselineSnapshot] = useState(() => toSnapshot(initialDraft));
  const [step, setStep] = useState<number>(
    mode === 'edit' ? 1 : Math.min(4, Math.max(1, initialDraft.step || 1)),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newPhotoInput, setNewPhotoInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  useEffect(() => {
    setDraft(initialDraft);
    setBaselineSnapshot(toSnapshot(initialDraft));
    setStep(mode === 'edit' ? 1 : Math.min(4, Math.max(1, initialDraft.step || 1)));
    setErrors({});
  }, [initialDraft, mode]);

  const hasChanges = useMemo(
    () => JSON.stringify(toSnapshot(draft)) !== JSON.stringify(baselineSnapshot),
    [draft, baselineSnapshot],
  );

  useEffect(() => {
    if (mode === 'create' && user?.uid) {
      saveListingDraft(user.uid, { ...draft, step });
    }
  }, [draft, step, mode, user?.uid]);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const handleViewport = () => {
      const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardOffset(offset > 40 ? offset : 0);
    };
    vv.addEventListener('resize', handleViewport);
    vv.addEventListener('scroll', handleViewport);
    return () => {
      vv.removeEventListener('resize', handleViewport);
      vv.removeEventListener('scroll', handleViewport);
    };
  }, []);

  useEffect(() => {
    setGuard({
      isDirty: hasChanges,
      onDiscard: () => {
        if (mode === 'edit' && initialListing) {
          setDraft(listingToDraft(initialListing));
        } else if (user?.uid) {
          clearListingDraft(user.uid);
        }
      },
    });
    return () => setGuard(null);
  }, [hasChanges, mode, initialListing, user?.uid, setGuard]);

  const validateStep = (targetStep: number): Record<string, string> => {
    const next: Record<string, string> = {};

    if (targetStep === 1) {
      const title = draft.title.trim();
      if (!title) next.title = 'Please enter a listing title.';
      else if (title.length < 5) next.title = 'Title must be at least 5 characters.';
      else if (title.length > 120) next.title = 'Title must be 120 characters or fewer.';

      if (!draft.nearbyLandmark.trim()) {
        next.nearbyLandmark = 'Please add a nearby college or landmark.';
      }
      if (!draft.description.trim()) {
        next.description = 'Please write a short description of the room or property.';
      } else if (draft.description.trim().length < 20) {
        next.description = 'Description should be at least 20 characters.';
      } else if (draft.description.length > 500) {
        next.description = 'Description must be 500 characters or fewer.';
      }
    }

    if (targetStep === 2) {
      if (!draft.address.street.trim()) next.street = 'Please enter street or building name.';
      if (!draft.address.area.trim()) next.area = 'Please enter the locality or area.';
      if (!draft.address.city.trim()) next.city = 'Please enter the city.';
      if (draft.address.pincode.trim() && !/^\d{4,10}$/.test(draft.address.pincode.trim())) {
        next.pincode = 'Enter a valid numeric pincode (4–10 digits).';
      }

      if (!Number.isFinite(draft.rentPerMonth) || draft.rentPerMonth < 500 || draft.rentPerMonth > 200000) {
        next.rentPerMonth = 'Monthly rent must be between ₹500 and ₹2,00,000.';
      }
      if (!Number.isFinite(draft.securityDeposit) || draft.securityDeposit < 0 || draft.securityDeposit > 500000) {
        next.securityDeposit = 'Security deposit must be ₹0 to ₹5,00,000.';
      }
      if (!Number.isFinite(draft.totalBeds) || draft.totalBeds < 1 || draft.totalBeds > 50) {
        next.totalBeds = 'Total beds must be between 1 and 50.';
      }
      if (
        !Number.isFinite(draft.availableBeds) ||
        draft.availableBeds < 0 ||
        draft.availableBeds > draft.totalBeds
      ) {
        next.availableBeds = 'Available beds must be between 0 and total beds.';
      }
      if (!draft.availableFrom.trim()) {
        next.availableFrom = 'Please choose an available-from date.';
      }
    }

    if (targetStep === 3) {
      if (!draft.houseRules.curfewTime.trim()) {
        next.curfewTime = 'Enter a curfew time (or "No curfew").';
      }
    }

    if (targetStep === 4) {
      const invalidUrl = draft.photoUrls.find((u) => !isSafeImageUrl(u));
      if (invalidUrl) {
        next.photoUrls = 'All photo URLs must be valid http(s) links.';
      }
      if (!draft.authorizedConfirmed) {
        next.authorizedConfirmed = 'Please confirm you are authorized to rent this property.';
      }
    }

    return next;
  };

  const goToStep = (nextStep: number) => {
    if (nextStep > step) {
      const stepErrors = validateStep(step);
      if (Object.keys(stepErrors).length > 0) {
        setErrors(stepErrors);
        const firstMsg = Object.values(stepErrors)[0];
        showToast(`Step ${step}: ${firstMsg}`, 'error');
        return;
      }
    }
    setErrors({});
    setStep(Math.min(4, Math.max(1, nextStep)));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleAmenity = (amenity: ListingAmenity) => {
    setDraft((prev) => {
      const exists = prev.amenities.includes(amenity);
      return {
        ...prev,
        amenities: exists
          ? prev.amenities.filter((a) => a !== amenity)
          : [...prev.amenities, amenity],
      };
    });
  };

  const handleAddPhotoUrl = () => {
    const trimmed = newPhotoInput.trim();
    if (!trimmed) return;
    if (draft.photoUrls.length >= 5) {
      setErrors((prev) => ({ ...prev, photoUrls: 'You can add up to 5 photo URLs.' }));
      return;
    }
    if (!isSafeImageUrl(trimmed)) {
      setErrors((prev) => ({
        ...prev,
        photoUrls: 'Please enter a valid http:// or https:// image URL.',
      }));
      return;
    }
    if (draft.photoUrls.includes(trimmed)) {
      setNewPhotoInput('');
      return;
    }
    setDraft((prev) => ({ ...prev, photoUrls: [...prev.photoUrls, trimmed] }));
    setNewPhotoInput('');
    setErrors((prev) => {
      const copy = { ...prev };
      delete copy.photoUrls;
      return copy;
    });
  };

  const handleRemovePhotoUrl = (url: string) => {
    setDraft((prev) => ({
      ...prev,
      photoUrls: prev.photoUrls.filter((u) => u !== url),
    }));
  };

  const handleSave = async () => {
    if (!user?.uid || saving) return;

    for (let s = 1; s <= 4; s += 1) {
      const stepErrors = validateStep(s);
      if (Object.keys(stepErrors).length > 0) {
        setStep(s);
        setErrors(stepErrors);
        const firstMsg = Object.values(stepErrors)[0];
        showToast(`Please fix Step ${s} (${STEP_TITLES[s - 1]}): ${firstMsg}`, 'error');
        return;
      }
    }

    setErrors({});
    setSaving(true);
    try {
      const payload: SaveListingInput = {
        title: draft.title.trim(),
        propertyType: draft.propertyType,
        address: { ...draft.address },
        rentPerMonth: Number(draft.rentPerMonth),
        securityDeposit: Number(draft.securityDeposit),
        totalBeds: Number(draft.totalBeds),
        availableBeds: Number(draft.availableBeds),
        genderAllowed: draft.genderAllowed,
        furnished: draft.furnished,
        amenities: draft.amenities,
        houseRules: { ...draft.houseRules },
        nearbyLandmark: draft.nearbyLandmark.trim(),
        availableFrom: draft.availableFrom,
        description: draft.description.trim(),
        photoUrls: draft.photoUrls,
        authorizedConfirmed: true,
        status: draft.status,
      };

      const saved = await saveListing(
        user.uid,
        user.name,
        payload,
        mode === 'edit' ? initialListing : null,
      );

      setBaselineSnapshot(toSnapshot(listingToDraft(saved)));
      setGuard(null);
      showToast(
        mode === 'edit' ? 'Listing updated' : 'Listing published!',
        'success',
      );
      onSaved(saved);
    } catch (err) {
      console.error('Save listing failed:', { err, draft });
      showToast(
        err instanceof Error ? err.message : 'Could not save listing. Please try again.',
        'error',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancelClick = () => {
    if (hasChanges) {
      setCancelDialogOpen(true);
    } else {
      navigate('/owner');
    }
  };

  const handleConfirmDiscard = () => {
    setCancelDialogOpen(false);
    setGuard(null);
    if (mode === 'create' && user?.uid) {
      clearListingDraft(user.uid);
    }
    navigate('/owner');
  };

  const progressPct = Math.round((step / 4) * 100);

  return (
    <div className="max-w-3xl mx-auto pb-28">
      {/* Step Header & Progress */}
      <div className="bg-white dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-[0_2px_16px_-4px_rgba(26,25,43,0.07)] dark:shadow-none mb-5">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div>
            <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
              Step {step} of 4
            </p>
            <h2 className="font-display text-lg sm:text-xl font-bold text-indigo-950 dark:text-slate-100 mt-0.5">
              {STEP_TITLES[step - 1]}
            </h2>
          </div>
          <span className="text-xs font-semibold text-stone-500 dark:text-slate-400 tabular-nums">
            {progressPct}%
          </span>
        </div>

        <div className="h-2 rounded-full bg-stone-100 dark:bg-slate-800 overflow-hidden mb-4">
          <div
            className="h-full rounded-full bg-indigo-600 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {STEP_TITLES.map((label, idx) => {
            const sNum = idx + 1;
            const active = sNum === step;
            return (
              <button
                key={label}
                type="button"
                onClick={() => goToStep(sNum)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors text-left truncate cursor-pointer ${
                  active
                    ? 'bg-indigo-600 text-white'
                    : sNum < step
                      ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300'
                      : 'bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-slate-300 hover:bg-stone-200/70 dark:hover:bg-slate-700'
                }`}
              >
                {sNum}. {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Step Card */}
      <div className="bg-white dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-[0_2px_18px_-4px_rgba(26,25,43,0.07)] dark:shadow-none space-y-6">
        {step === 1 && (
          <>
            <div>
              <label htmlFor="listing-title" className="block text-sm font-medium text-stone-800 dark:text-slate-200 mb-1.5">
                Listing title
              </label>
              <input
                id="listing-title"
                type="text"
                maxLength={120}
                value={draft.title}
                onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Sunlit 2-Sharing PG near IIT Indore"
                className={`w-full min-h-[44px] rounded-xl border px-3.5 py-2.5 text-sm bg-white dark:bg-slate-950 text-stone-900 dark:text-slate-100 ${
                  errors.title ? 'border-rose-400 dark:border-rose-500' : 'border-stone-300 dark:border-slate-700'
                }`}
              />
              {errors.title && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-rose-700 dark:text-rose-400">
                  <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{errors.title}</span>
                </p>
              )}
            </div>

            <fieldset>
              <legend className="block text-sm font-medium text-stone-800 dark:text-slate-200 mb-2">
                Property type
              </legend>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {PROPERTY_TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setDraft((p) => ({ ...p, propertyType: opt.value as PropertyType }))}
                    className={`min-h-[44px] px-3.5 py-2 rounded-xl border text-sm font-semibold transition-colors cursor-pointer ${
                      draft.propertyType === opt.value
                        ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-950/70 text-indigo-950 dark:text-indigo-100'
                        : 'border-stone-200 dark:border-slate-700 text-stone-700 dark:text-slate-200 hover:bg-stone-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <fieldset>
                <legend className="block text-sm font-medium text-stone-800 dark:text-slate-200 mb-2">
                  Gender allowed
                </legend>
                <div className="grid grid-cols-3 gap-2">
                  {GENDER_ALLOWED_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        setDraft((p) => ({ ...p, genderAllowed: opt.value as ListingGenderAllowed }))
                      }
                      className={`min-h-[44px] px-2.5 py-2 rounded-xl border text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                        draft.genderAllowed === opt.value
                          ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-950/70 text-indigo-950 dark:text-indigo-100'
                          : 'border-stone-200 dark:border-slate-700 text-stone-700 dark:text-slate-200 hover:bg-stone-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className="block text-sm font-medium text-stone-800 dark:text-slate-200 mb-2">
                  Furnishing
                </legend>
                <div className="grid grid-cols-3 gap-2">
                  {FURNISHED_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        setDraft((p) => ({ ...p, furnished: opt.value as FurnishedStatus }))
                      }
                      className={`min-h-[44px] px-2 py-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                        draft.furnished === opt.value
                          ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-950/70 text-indigo-950 dark:text-indigo-100'
                          : 'border-stone-200 dark:border-slate-700 text-stone-700 dark:text-slate-200 hover:bg-stone-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>

            <div>
              <label htmlFor="listing-landmark" className="block text-sm font-medium text-stone-800 dark:text-slate-200 mb-1.5">
                Nearby college or landmark
              </label>
              <input
                id="listing-landmark"
                type="text"
                maxLength={120}
                value={draft.nearbyLandmark}
                onChange={(e) => setDraft((p) => ({ ...p, nearbyLandmark: e.target.value }))}
                placeholder="e.g. 600m from IET DAVV Gate 2"
                className={`w-full min-h-[44px] rounded-xl border px-3.5 py-2.5 text-sm bg-white dark:bg-slate-950 text-stone-900 dark:text-slate-100 ${
                  errors.nearbyLandmark ? 'border-rose-400 dark:border-rose-500' : 'border-stone-300 dark:border-slate-700'
                }`}
              />
              {errors.nearbyLandmark && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-rose-700 dark:text-rose-400">
                  <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{errors.nearbyLandmark}</span>
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="listing-description" className="block text-sm font-medium text-stone-800 dark:text-slate-200">
                  Description
                </label>
                <span className="text-xs text-stone-500 dark:text-slate-400 tabular-nums">
                  {draft.description.length}/500
                </span>
              </div>
              <textarea
                id="listing-description"
                rows={4}
                maxLength={500}
                value={draft.description}
                onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))}
                placeholder="Describe room layout, natural light, food/kitchen setup, electricity terms, and commute."
                className={`w-full rounded-xl border px-3.5 py-2.5 text-sm bg-white dark:bg-slate-950 text-stone-900 dark:text-slate-100 ${
                  errors.description ? 'border-rose-400 dark:border-rose-500' : 'border-stone-300 dark:border-slate-700'
                }`}
              />
              {errors.description && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-rose-700 dark:text-rose-400">
                  <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{errors.description}</span>
                </p>
              )}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label htmlFor="addr-street" className="block text-sm font-medium text-stone-800 dark:text-slate-200 mb-1.5">
                  Street / Building address
                </label>
                <input
                  id="addr-street"
                  type="text"
                  maxLength={160}
                  value={draft.address.street}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      address: { ...p.address, street: e.target.value },
                    }))
                  }
                  placeholder="e.g. Plot 42, Silver Oak Residency"
                  className={`w-full min-h-[44px] rounded-xl border px-3.5 py-2.5 text-sm bg-white dark:bg-slate-950 text-stone-900 dark:text-slate-100 ${
                    errors.street ? 'border-rose-400 dark:border-rose-500' : 'border-stone-300 dark:border-slate-700'
                  }`}
                />
                {errors.street && (
                  <p className="mt-1 text-xs text-rose-700 dark:text-rose-400">{errors.street}</p>
                )}
              </div>

              <div>
                <label htmlFor="addr-area" className="block text-sm font-medium text-stone-800 dark:text-slate-200 mb-1.5">
                  Area / Locality
                </label>
                <input
                  id="addr-area"
                  type="text"
                  maxLength={100}
                  value={draft.address.area}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      address: { ...p.address, area: e.target.value },
                    }))
                  }
                  placeholder="e.g. Bhawarkua / Kothrud"
                  className={`w-full min-h-[44px] rounded-xl border px-3.5 py-2.5 text-sm bg-white dark:bg-slate-950 text-stone-900 dark:text-slate-100 ${
                    errors.area ? 'border-rose-400 dark:border-rose-500' : 'border-stone-300 dark:border-slate-700'
                  }`}
                />
                {errors.area && (
                  <p className="mt-1 text-xs text-rose-700 dark:text-rose-400">{errors.area}</p>
                )}
              </div>

              <div>
                <label htmlFor="addr-city" className="block text-sm font-medium text-stone-800 dark:text-slate-200 mb-1.5">
                  City
                </label>
                <input
                  id="addr-city"
                  type="text"
                  maxLength={80}
                  value={draft.address.city}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      address: { ...p.address, city: e.target.value },
                    }))
                  }
                  placeholder="e.g. Indore"
                  className={`w-full min-h-[44px] rounded-xl border px-3.5 py-2.5 text-sm bg-white dark:bg-slate-950 text-stone-900 dark:text-slate-100 ${
                    errors.city ? 'border-rose-400 dark:border-rose-500' : 'border-stone-300 dark:border-slate-700'
                  }`}
                />
                {errors.city && (
                  <p className="mt-1 text-xs text-rose-700 dark:text-rose-400">{errors.city}</p>
                )}
              </div>

              <div>
                <label htmlFor="addr-pincode" className="block text-sm font-medium text-stone-800 dark:text-slate-200 mb-1.5">
                  Pincode <span className="text-xs font-normal text-stone-500 dark:text-slate-400">(optional)</span>
                </label>
                <input
                  id="addr-pincode"
                  type="text"
                  maxLength={10}
                  value={draft.address.pincode}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      address: { ...p.address, pincode: e.target.value },
                    }))
                  }
                  placeholder="452001"
                  className={`w-full min-h-[44px] rounded-xl border px-3.5 py-2.5 text-sm bg-white dark:bg-slate-950 text-stone-900 dark:text-slate-100 ${
                    errors.pincode ? 'border-rose-400 dark:border-rose-500' : 'border-stone-300 dark:border-slate-700'
                  }`}
                />
                {errors.pincode && (
                  <p className="mt-1 text-xs text-rose-700 dark:text-rose-400">{errors.pincode}</p>
                )}
              </div>

              <div>
                <label htmlFor="avail-from" className="block text-sm font-medium text-stone-800 dark:text-slate-200 mb-1.5">
                  Available from
                </label>
                <input
                  id="avail-from"
                  type="date"
                  value={draft.availableFrom}
                  onChange={(e) => setDraft((p) => ({ ...p, availableFrom: e.target.value }))}
                  className={`w-full min-h-[44px] rounded-xl border px-3.5 py-2.5 text-sm bg-white dark:bg-slate-950 text-stone-900 dark:text-slate-100 ${
                    errors.availableFrom ? 'border-rose-400 dark:border-rose-500' : 'border-stone-300 dark:border-slate-700'
                  }`}
                />
                {errors.availableFrom && (
                  <p className="mt-1 text-xs text-rose-700 dark:text-rose-400">{errors.availableFrom}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-stone-100 dark:border-slate-800">
              <div>
                <label htmlFor="rent-per-month" className="block text-sm font-medium text-stone-800 dark:text-slate-200 mb-1.5">
                  Monthly rent per bed (INR)
                </label>
                <input
                  id="rent-per-month"
                  type="number"
                  min={500}
                  max={200000}
                  step={500}
                  value={draft.rentPerMonth}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, rentPerMonth: Number(e.target.value) || 0 }))
                  }
                  className={`w-full min-h-[44px] rounded-xl border px-3.5 py-2.5 text-sm bg-white dark:bg-slate-950 text-stone-900 dark:text-slate-100 tabular-nums ${
                    errors.rentPerMonth ? 'border-rose-400 dark:border-rose-500' : 'border-stone-300 dark:border-slate-700'
                  }`}
                />
                {errors.rentPerMonth && (
                  <p className="mt-1 text-xs text-rose-700 dark:text-rose-400">{errors.rentPerMonth}</p>
                )}
              </div>

              <div>
                <label htmlFor="security-deposit" className="block text-sm font-medium text-stone-800 dark:text-slate-200 mb-1.5">
                  Security deposit (INR)
                </label>
                <input
                  id="security-deposit"
                  type="number"
                  min={0}
                  max={500000}
                  step={500}
                  value={draft.securityDeposit}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, securityDeposit: Number(e.target.value) || 0 }))
                  }
                  className={`w-full min-h-[44px] rounded-xl border px-3.5 py-2.5 text-sm bg-white dark:bg-slate-950 text-stone-900 dark:text-slate-100 tabular-nums ${
                    errors.securityDeposit ? 'border-rose-400 dark:border-rose-500' : 'border-stone-300 dark:border-slate-700'
                  }`}
                />
                {errors.securityDeposit && (
                  <p className="mt-1 text-xs text-rose-700 dark:text-rose-400">{errors.securityDeposit}</p>
                )}
              </div>

              <div>
                <label htmlFor="total-beds" className="block text-sm font-medium text-stone-800 dark:text-slate-200 mb-1.5">
                  Total beds
                </label>
                <input
                  id="total-beds"
                  type="number"
                  min={1}
                  max={50}
                  value={draft.totalBeds}
                  onChange={(e) => {
                    const nextTotal = Math.max(1, Math.min(50, Number(e.target.value) || 1));
                    setDraft((p) => ({
                      ...p,
                      totalBeds: nextTotal,
                      availableBeds: Math.min(p.availableBeds, nextTotal),
                    }));
                  }}
                  className={`w-full min-h-[44px] rounded-xl border px-3.5 py-2.5 text-sm bg-white dark:bg-slate-950 text-stone-900 dark:text-slate-100 tabular-nums ${
                    errors.totalBeds ? 'border-rose-400 dark:border-rose-500' : 'border-stone-300 dark:border-slate-700'
                  }`}
                />
                {errors.totalBeds && (
                  <p className="mt-1 text-xs text-rose-700 dark:text-rose-400">{errors.totalBeds}</p>
                )}
              </div>

              <div>
                <label htmlFor="available-beds" className="block text-sm font-medium text-stone-800 dark:text-slate-200 mb-1.5">
                  Available beds
                </label>
                <input
                  id="available-beds"
                  type="number"
                  min={0}
                  max={draft.totalBeds}
                  value={draft.availableBeds}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, availableBeds: Math.max(0, Number(e.target.value) || 0) }))
                  }
                  className={`w-full min-h-[44px] rounded-xl border px-3.5 py-2.5 text-sm bg-white dark:bg-slate-950 text-stone-900 dark:text-slate-100 tabular-nums ${
                    errors.availableBeds ? 'border-rose-400 dark:border-rose-500' : 'border-stone-300 dark:border-slate-700'
                  }`}
                />
                {errors.availableBeds && (
                  <p className="mt-1 text-xs text-rose-700 dark:text-rose-400">{errors.availableBeds}</p>
                )}
              </div>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <fieldset>
              <legend className="block text-sm font-medium text-stone-800 dark:text-slate-200 mb-2.5">
                Amenities included
              </legend>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {AMENITY_OPTIONS.map((item) => {
                  const selected = draft.amenities.includes(item.value);
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => toggleAmenity(item.value)}
                      className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs sm:text-sm font-medium flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                        selected
                          ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-950/70 text-indigo-950 dark:text-indigo-100 font-semibold'
                          : 'border-stone-200 dark:border-slate-700 text-stone-700 dark:text-slate-200 hover:bg-stone-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span>{item.label}</span>
                      {selected && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="pt-4 border-t border-stone-100 dark:border-slate-800 space-y-4">
              <h3 className="font-display text-base font-bold text-indigo-950 dark:text-slate-100">
                House rules
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(
                  [
                    { key: 'smokingAllowed', label: 'Smoking allowed' },
                    { key: 'drinkingAllowed', label: 'Drinking allowed' },
                    { key: 'guestsAllowed', label: 'Guests / visitors allowed' },
                    { key: 'vegOnly', label: 'Vegetarian kitchen only' },
                    { key: 'petsAllowed', label: 'Pets allowed' },
                  ] as const
                ).map((rule) => {
                  const enabled = draft.houseRules[rule.key];
                  return (
                    <div
                      key={rule.key}
                      className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 dark:border-slate-700 px-3.5 py-2.5"
                    >
                      <span className="text-sm font-medium text-stone-800 dark:text-slate-200">
                        {rule.label}
                      </span>
                      <div className="inline-flex rounded-lg bg-stone-100 dark:bg-slate-800 p-0.5">
                        <button
                          type="button"
                          onClick={() =>
                            setDraft((p) => ({
                              ...p,
                              houseRules: { ...p.houseRules, [rule.key]: true },
                            }))
                          }
                          className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                            enabled
                              ? 'bg-indigo-600 text-white'
                              : 'text-stone-600 dark:text-slate-300'
                          }`}
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setDraft((p) => ({
                              ...p,
                              houseRules: { ...p.houseRules, [rule.key]: false },
                            }))
                          }
                          className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                            !enabled
                              ? 'bg-white dark:bg-slate-900 text-stone-900 dark:text-slate-100 shadow-xs'
                              : 'text-stone-600 dark:text-slate-300'
                          }`}
                        >
                          No
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div>
                <label htmlFor="curfew-time" className="block text-sm font-medium text-stone-800 dark:text-slate-200 mb-1.5">
                  Gate / entry curfew
                </label>
                <input
                  id="curfew-time"
                  type="text"
                  maxLength={40}
                  value={draft.houseRules.curfewTime}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      houseRules: { ...p.houseRules, curfewTime: e.target.value },
                    }))
                  }
                  placeholder="e.g. 11:00 PM or No curfew"
                  className={`w-full min-h-[44px] rounded-xl border px-3.5 py-2.5 text-sm bg-white dark:bg-slate-950 text-stone-900 dark:text-slate-100 ${
                    errors.curfewTime ? 'border-rose-400 dark:border-rose-500' : 'border-stone-300 dark:border-slate-700'
                  }`}
                />
                {errors.curfewTime && (
                  <p className="mt-1 text-xs text-rose-700 dark:text-rose-400">{errors.curfewTime}</p>
                )}
              </div>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="photo-url-input" className="block text-sm font-medium text-stone-800 dark:text-slate-200">
                  Property photo URLs <span className="text-xs font-normal text-stone-500 dark:text-slate-400">(optional, up to 5)</span>
                </label>
                <span className="text-xs text-stone-500 dark:text-slate-400 tabular-nums">
                  {draft.photoUrls.length}/5
                </span>
              </div>

              <div className="flex gap-2">
                <input
                  id="photo-url-input"
                  type="url"
                  value={newPhotoInput}
                  onChange={(e) => setNewPhotoInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddPhotoUrl();
                    }
                  }}
                  placeholder="https://example.com/room-photo.jpg"
                  disabled={draft.photoUrls.length >= 5}
                  className="flex-1 min-h-[44px] rounded-xl border border-stone-300 dark:border-slate-700 px-3.5 py-2 text-sm bg-white dark:bg-slate-950 text-stone-900 dark:text-slate-100"
                />
                <button
                  type="button"
                  onClick={handleAddPhotoUrl}
                  disabled={!newPhotoInput.trim() || draft.photoUrls.length >= 5}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-xl bg-stone-900 dark:bg-slate-800 text-white text-sm font-semibold hover:bg-stone-800 dark:hover:bg-slate-700 disabled:opacity-50 cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" />
                  <span>Add</span>
                </button>
              </div>
              {errors.photoUrls && (
                <p className="mt-1.5 text-xs text-rose-700 dark:text-rose-400">{errors.photoUrls}</p>
              )}

              {draft.photoUrls.length === 0 ? (
                <div className="mt-3 rounded-xl border border-dashed border-stone-300 dark:border-slate-700 px-4 py-5 text-center text-xs text-stone-500 dark:text-slate-400">
                  <ImagePlus className="w-5 h-5 mx-auto mb-1.5 text-stone-400 dark:text-slate-500" aria-hidden="true" />
                  No photos added yet. You can publish now or paste up to 5 photo links.
                </div>
              ) : (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {draft.photoUrls.map((url, idx) => (
                    <div
                      key={url}
                      className="flex items-center justify-between gap-2.5 rounded-xl border border-stone-200 dark:border-slate-700 p-2 bg-[#f8f7f4] dark:bg-slate-950"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={url}
                          alt={`Listing preview ${idx + 1}`}
                          referrerPolicy="no-referrer"
                          className="w-12 h-12 rounded-lg object-cover bg-stone-200 dark:bg-slate-800 shrink-0"
                        />
                        <span className="text-xs text-stone-600 dark:text-slate-300 truncate">{url}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemovePhotoUrl(url)}
                        className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 shrink-0 cursor-pointer"
                        aria-label={`Remove photo ${idx + 1}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {mode === 'edit' && (
              <fieldset>
                <legend className="block text-sm font-medium text-stone-800 dark:text-slate-200 mb-2">
                  Listing status
                </legend>
                <div className="grid grid-cols-3 gap-2.5">
                  {(['active', 'paused', 'rented'] as ListingStatus[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setDraft((p) => ({ ...p, status: st }))}
                      className={`min-h-[42px] px-3 py-2 rounded-xl border text-sm font-semibold capitalize transition-colors cursor-pointer ${
                        draft.status === st
                          ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-950/70 text-indigo-950 dark:text-indigo-100'
                          : 'border-stone-200 dark:border-slate-700 text-stone-700 dark:text-slate-200 hover:bg-stone-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}

            <div className="rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/70 p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.authorizedConfirmed}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, authorizedConfirmed: e.target.checked }))
                  }
                  className="mt-0.5 w-4 h-4 accent-indigo-600 rounded"
                />
                <div>
                  <span className="text-sm font-semibold text-indigo-950 dark:text-indigo-100 inline-flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                    I confirm I am authorized to rent this property
                  </span>
                  <p className="text-xs text-stone-600 dark:text-slate-300 mt-1">
                    Your email and phone number stay hidden from public listings and are never exposed
                    without your action.
                  </p>
                </div>
              </label>
              {errors.authorizedConfirmed && (
                <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-rose-700 dark:text-rose-400">
                  <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{errors.authorizedConfirmed}</span>
                </p>
              )}
            </div>
          </>
        )}

        {/* Step Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-stone-100 dark:border-slate-800">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => goToStep(step - 1)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-stone-700 dark:text-slate-200 hover:bg-stone-50 dark:hover:bg-slate-700 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={() => goToStep(step + 1)}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 min-h-[44px] rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
          ) : (
            <div />
          )}
        </div>
      </div>

      {/* Sticky Save & Cancel bar on EVERY step */}
      <div
        className="fixed inset-x-0 z-40 border-t border-stone-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-[0_-4px_20px_-4px_rgba(26,25,43,0.1)] dark:shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.45)]"
        style={{ bottom: `${keyboardOffset}px` }}
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center justify-between gap-3">
          <div className="min-w-0">
            {hasChanges ? (
              <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-amber-700 dark:text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" aria-hidden="true" />
                <span className="truncate">
                  {mode === 'create' ? 'Draft autosaved locally' : 'Unsaved changes'}
                </span>
              </span>
            ) : (
              <span className="text-xs sm:text-sm text-stone-500 dark:text-slate-400 truncate block">
                {mode === 'create' ? 'Fill all 4 steps to publish' : 'No unsaved changes'}
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
              disabled={(mode === 'edit' && !hasChanges) || saving}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
              <span>
                {saving
                  ? 'Saving...'
                  : mode === 'edit'
                    ? 'Save changes'
                    : 'Publish listing'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {cancelDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/45 dark:bg-black/70 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-listing-title"
        >
          <div className="bg-white dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-start gap-3 mb-4">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 shrink-0">
                <AlertTriangle className="w-5 h-5" aria-hidden="true" />
              </span>
              <div>
                <h2 id="cancel-listing-title" className="font-display text-lg font-bold text-indigo-950 dark:text-slate-100">
                  Discard unsaved changes?
                </h2>
                <p className="text-sm text-stone-600 dark:text-slate-300 mt-1 leading-relaxed">
                  You have unsaved changes on this listing. Leaving now will discard them.
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
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
