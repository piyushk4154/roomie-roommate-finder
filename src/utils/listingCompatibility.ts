import type {
  FurnishedStatus,
  Listing,
  ListingAmenity,
  ListingGenderAllowed,
  ListingStatus,
  PropertyType,
  RoommateProfile,
} from '../services/types';

export const PROPERTY_TYPE_OPTIONS: Array<{ value: PropertyType; label: string }> = [
  { value: 'single_room', label: 'Single room' },
  { value: 'shared_room', label: 'Shared room' },
  { value: 'pg', label: 'PG' },
  { value: 'flat', label: 'Flat' },
  { value: 'hostel', label: 'Hostel' },
];

export const GENDER_ALLOWED_OPTIONS: Array<{ value: ListingGenderAllowed; label: string }> = [
  { value: 'boys', label: 'Boys' },
  { value: 'girls', label: 'Girls' },
  { value: 'any', label: 'Any' },
];

export const FURNISHED_OPTIONS: Array<{ value: FurnishedStatus; label: string }> = [
  { value: 'furnished', label: 'Furnished' },
  { value: 'semi', label: 'Semi-furnished' },
  { value: 'unfurnished', label: 'Unfurnished' },
];

export const AMENITY_OPTIONS: Array<{ value: ListingAmenity; label: string }> = [
  { value: 'wifi', label: 'WiFi' },
  { value: 'ac', label: 'AC' },
  { value: 'meals', label: 'Meals' },
  { value: 'laundry', label: 'Laundry' },
  { value: 'parking', label: 'Parking' },
  { value: 'power_backup', label: 'Power backup' },
  { value: 'geyser', label: 'Geyser' },
  { value: 'study_table', label: 'Study table' },
  { value: 'cctv', label: 'CCTV' },
  { value: 'housekeeping', label: 'Housekeeping' },
];

export const LISTING_STATUS_LABELS: Record<ListingStatus, string> = {
  active: 'Active',
  paused: 'Paused',
  rented: 'Rented',
};

export function formatPropertyType(type: PropertyType): string {
  return PROPERTY_TYPE_OPTIONS.find((o) => o.value === type)?.label || type;
}

export function formatGenderAllowed(gender: ListingGenderAllowed): string {
  if (gender === 'boys') return 'Boys only';
  if (gender === 'girls') return 'Girls only';
  return 'Any gender';
}

export function formatFurnished(furnished: FurnishedStatus): string {
  return FURNISHED_OPTIONS.find((o) => o.value === furnished)?.label || furnished;
}

export function formatAmenity(amenity: ListingAmenity): string {
  return AMENITY_OPTIONS.find((o) => o.value === amenity)?.label || amenity;
}

export interface ListingRuleCheckItem {
  key: string;
  label: string;
  listingRule: string;
  studentHabit: string;
  status: 'match' | 'warning' | 'conflict';
  detail: string;
}

export interface ListingCompatibilityResult {
  compatible: boolean;
  conflictCount: number;
  warningCount: number;
  badgeLabel: string;
  tone: 'emerald' | 'amber' | 'rose';
  items: ListingRuleCheckItem[];
}

export function evaluateListingCompatibility(
  profile: RoommateProfile | null,
  listing: Listing,
): ListingCompatibilityResult {
  const rules = listing.houseRules;

  if (!profile) {
    return {
      compatible: true,
      conflictCount: 0,
      warningCount: 0,
      badgeLabel: 'Rules listed',
      tone: 'emerald',
      items: [],
    };
  }

  const items: ListingRuleCheckItem[] = [];

  // 1. Gender allowed check
  const studentGender = profile.basics.gender;
  const genderConflict =
    (listing.genderAllowed === 'boys' && studentGender === 'female') ||
    (listing.genderAllowed === 'girls' && studentGender === 'male');
  items.push({
    key: 'genderAllowed',
    label: 'Resident policy',
    listingRule: formatGenderAllowed(listing.genderAllowed),
    studentHabit:
      studentGender === 'male'
        ? 'Male'
        : studentGender === 'female'
          ? 'Female'
          : 'Other / Prefer not to say',
    status: genderConflict ? 'conflict' : 'match',
    detail: genderConflict
      ? `Listing is ${formatGenderAllowed(listing.genderAllowed).toLowerCase()}, which conflicts with your profile.`
      : 'Matches your profile.',
  });

  // 2. Smoking rule
  const studentSmokes = profile.lifestyle.smoking !== 'never';
  const smokingConflict = studentSmokes && !rules.smokingAllowed;
  items.push({
    key: 'smoking',
    label: 'Smoking',
    listingRule: rules.smokingAllowed ? 'Allowed' : 'Not allowed',
    studentHabit:
      profile.lifestyle.smoking === 'never'
        ? 'Never'
        : profile.lifestyle.smoking === 'occasionally'
          ? 'Occasionally'
          : 'Regularly',
    status: smokingConflict ? 'conflict' : 'match',
    detail: smokingConflict
      ? 'You smoke, but smoking is not permitted at this property.'
      : rules.smokingAllowed
        ? 'Smoking is allowed here.'
        : 'Smoke-free property matches your non-smoking habit.',
  });

  // 3. Drinking rule
  const studentDrinks = profile.lifestyle.drinking !== 'never';
  const drinkingConflict = studentDrinks && !rules.drinkingAllowed;
  items.push({
    key: 'drinking',
    label: 'Drinking',
    listingRule: rules.drinkingAllowed ? 'Allowed' : 'Not allowed',
    studentHabit:
      profile.lifestyle.drinking === 'never'
        ? 'Never'
        : profile.lifestyle.drinking === 'socially'
          ? 'Socially'
          : 'Regularly',
    status: drinkingConflict ? 'conflict' : 'match',
    detail: drinkingConflict
      ? 'You drink, but alcohol is not allowed here.'
      : rules.drinkingAllowed
        ? 'Drinking is allowed on the premises.'
        : 'Alcohol-free policy matches your preference.',
  });

  // 4. Guests / Visitors rule
  const studentHasGuests = profile.lifestyle.guests !== 'never';
  const guestsConflict = studentHasGuests && !rules.guestsAllowed;
  items.push({
    key: 'guests',
    label: 'Guests & visitors',
    listingRule: rules.guestsAllowed ? 'Guests allowed' : 'No guests allowed',
    studentHabit:
      profile.lifestyle.guests === 'never'
        ? 'Never'
        : profile.lifestyle.guests === 'sometimes'
          ? 'Sometimes'
          : 'Often',
    status: guestsConflict ? 'conflict' : 'match',
    detail: guestsConflict
      ? 'You host guests occasionally/often, but visitors are restricted.'
      : rules.guestsAllowed
        ? 'Visitors are permitted.'
        : 'No-guest policy aligns with your preference.',
  });

  // 5. Veg-only diet rule
  const studentEatsNonVeg = profile.lifestyle.diet === 'non_vegetarian';
  const studentEatsEggs = profile.lifestyle.diet === 'eggetarian';
  const dietConflict = rules.vegOnly && studentEatsNonVeg;
  const dietWarning = rules.vegOnly && studentEatsEggs;
  items.push({
    key: 'vegOnly',
    label: 'Kitchen & diet',
    listingRule: rules.vegOnly ? 'Vegetarian only' : 'All diets allowed',
    studentHabit:
      profile.lifestyle.diet === 'vegetarian'
        ? 'Vegetarian'
        : profile.lifestyle.diet === 'eggetarian'
          ? 'Eggetarian'
          : 'Non-vegetarian',
    status: dietConflict ? 'conflict' : dietWarning ? 'warning' : 'match',
    detail: dietConflict
      ? 'This property is strictly vegetarian only.'
      : dietWarning
        ? 'Property is veg only—confirm with the owner whether eggs are okay.'
        : 'Matches your dietary habits.',
  });

  // 6. Pets rule
  const hasPet = profile.lifestyle.pets === 'has_pet';
  const petsConflict = hasPet && !rules.petsAllowed;
  items.push({
    key: 'pets',
    label: 'Pets',
    listingRule: rules.petsAllowed ? 'Pets allowed' : 'No pets allowed',
    studentHabit:
      profile.lifestyle.pets === 'has_pet'
        ? 'Has pet'
        : profile.lifestyle.pets === 'likes_pets'
          ? 'Likes pets'
          : 'Dislikes / allergic',
    status: petsConflict ? 'conflict' : 'match',
    detail: petsConflict
      ? 'You have a pet, but pets are not allowed here.'
      : 'Compatible with your pet status.',
  });

  // 7. Curfew vs Sleep Schedule
  const curfewText = rules.curfewTime.trim();
  const hasCurfew =
    curfewText.length > 0 && !curfewText.toLowerCase().includes('no curfew');
  const curfewWarning = hasCurfew && profile.lifestyle.sleepSchedule === 'night_owl';
  items.push({
    key: 'curfew',
    label: 'Entry curfew',
    listingRule: curfewText || 'No curfew',
    studentHabit:
      profile.lifestyle.sleepSchedule === 'early_bird'
        ? 'Early bird'
        : profile.lifestyle.sleepSchedule === 'night_owl'
          ? 'Night owl'
          : 'Flexible',
    status: curfewWarning ? 'warning' : 'match',
    detail: curfewWarning
      ? `Property has a ${curfewText} curfew—check if that fits your late-night routine.`
      : hasCurfew
        ? `Curfew at ${curfewText}.`
        : 'No entry curfew.',
  });

  const conflictCount = items.filter((i) => i.status === 'conflict').length;
  const warningCount = items.filter((i) => i.status === 'warning').length;
  const compatible = conflictCount === 0;

  let badgeLabel = 'Rules match';
  let tone: 'emerald' | 'amber' | 'rose' = 'emerald';

  if (conflictCount > 0) {
    badgeLabel = conflictCount === 1 ? '1 rule conflict' : `${conflictCount} rule conflicts`;
    tone = 'rose';
  } else if (warningCount > 0) {
    badgeLabel = 'Check curfew/diet';
    tone = 'amber';
  }

  return {
    compatible,
    conflictCount,
    warningCount,
    badgeLabel,
    tone,
    items,
  };
}
