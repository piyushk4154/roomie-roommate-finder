import type {
  DealBreakerKey,
  LifestyleTraitKey,
  ProfileLifestyle,
  RoommateProfile,
} from '../services/types';

export type BreakdownStatus = 'match' | 'partial' | 'mismatch';

export interface TraitBreakdownItem {
  key: LifestyleTraitKey;
  trait: string;
  yourAnswer: string;
  theirAnswer: string;
  similarity: number;
  status: BreakdownStatus;
  explanation: string;
}

export interface MatchComparisonResult {
  userId: string;
  score: number;
  excluded: boolean;
  excludeReason: string | null;
  breakdown: TraitBreakdownItem[];
  summary: string;
}

const TRAIT_LABELS: Record<LifestyleTraitKey, string> = {
  smoking: 'Smoking',
  drinking: 'Drinking',
  sleepSchedule: 'Sleep schedule',
  noiseLevel: 'Noise level',
  headphoneUse: 'Headphone use',
  cleanliness: 'Cleanliness',
  guests: 'Guests & visitors',
  studyHabits: 'Study habits',
  diet: 'Diet',
  pets: 'Pets',
};

const ORDINAL_INDEX: Record<Exclude<LifestyleTraitKey, 'cleanliness'>, Record<string, number>> = {
  smoking: { never: 0, occasionally: 1, regularly: 2 },
  drinking: { never: 0, socially: 1, regularly: 2 },
  sleepSchedule: { early_bird: 0, flexible: 1, night_owl: 2 },
  noiseLevel: { quiet: 0, moderate: 1, loud: 2 },
  headphoneUse: { always: 0, sometimes: 1, never: 2 },
  guests: { never: 0, sometimes: 1, often: 2 },
  studyHabits: { silence: 0, background_noise: 1, outside: 2 },
  diet: { vegetarian: 0, eggetarian: 1, non_vegetarian: 2 },
  pets: { has_pet: 0, likes_pets: 1, dislikes_allergic: 2 },
};

const VALUE_LABELS: Record<string, string> = {
  never: 'Never',
  occasionally: 'Occasionally',
  regularly: 'Regularly',
  socially: 'Socially',
  early_bird: 'Early bird (before 10pm)',
  flexible: 'Flexible',
  night_owl: 'Night owl (after 1am)',
  quiet: 'Quiet',
  moderate: 'Moderate',
  loud: 'Loud',
  always: 'Always',
  sometimes: 'Sometimes',
  often: 'Often',
  silence: 'Silence at home',
  background_noise: 'Background noise',
  outside: 'Mostly outside',
  vegetarian: 'Vegetarian',
  eggetarian: 'Eggetarian',
  non_vegetarian: 'Non-vegetarian',
  has_pet: 'Has a pet',
  likes_pets: 'Likes pets',
  dislikes_allergic: 'Dislikes / allergic',
};

export function formatTraitAnswer(key: LifestyleTraitKey, value: string | number): string {
  if (key === 'cleanliness') {
    return `${value} / 5`;
  }
  return VALUE_LABELS[String(value)] || String(value);
}

/**
 * Checks whether `candidate` violates any of `viewer`'s deal-breakers or explicit
 * "okay with..." constraints.
 */
function checkViewerDealBreakers(viewer: RoommateProfile, candidate: RoommateProfile): string | null {
  const cLife = candidate.lifestyle;
  const vLife = viewer.lifestyle;
  const breakers = new Set<DealBreakerKey>(viewer.dealBreakers || []);

  // Smoking tolerance check (deal-breaker checkbox OR "okay with smoker" = no)
  if ((breakers.has('smoker') || vLife.okayWithSmoker === 'no') && cLife.smoking !== 'never') {
    return 'Smoking preference conflict';
  }

  // Drinking tolerance check
  if ((breakers.has('drinker') || vLife.okayWithDrinker === 'no') && cLife.drinking !== 'never') {
    return 'Drinking preference conflict';
  }

  // Non-veg cooking tolerance check
  if (
    (breakers.has('non_veg_cooking') || vLife.okayWithNonVegCooking === 'no') &&
    cLife.diet === 'non_vegetarian'
  ) {
    return 'Shared kitchen diet preference conflict';
  }

  if (breakers.has('loud_noise') && cLife.noiseLevel === 'loud') {
    return 'Noise level deal-breaker (loud environment)';
  }

  if (breakers.has('night_owl') && cLife.sleepSchedule === 'night_owl') {
    return 'Sleep schedule deal-breaker (night owl)';
  }

  if (breakers.has('frequent_guests') && cLife.guests === 'often') {
    return 'Guests deal-breaker (frequent visitors)';
  }

  if (breakers.has('pets') && cLife.pets === 'has_pet') {
    return 'Pets deal-breaker';
  }

  if (breakers.has('messy_roommate') && cLife.cleanliness <= 2) {
    return 'Cleanliness deal-breaker (low tidiness rating)';
  }

  return null;
}

/**
 * Step 1: Bidirectional deal-breaker, gender preference, and budget overlap filter.
 */
function checkCompatibilityExclusion(a: RoommateProfile, b: RoommateProfile): string | null {
  // 1a. Check deal-breakers in both directions
  const aRejectsB = checkViewerDealBreakers(a, b);
  if (aRejectsB) return aRejectsB;

  const bRejectsA = checkViewerDealBreakers(b, a);
  if (bRejectsA) return `${bRejectsA} (other student's preference)`;

  // 1b. Check gender preferences in both directions
  const aPref = a.housing.roommateGenderPref;
  const bPref = b.housing.roommateGenderPref;
  if (aPref === 'same_gender' || bPref === 'same_gender') {
    const aGender = a.basics.gender;
    const bGender = b.basics.gender;
    if (
      aGender === 'prefer_not_to_say' ||
      bGender === 'prefer_not_to_say' ||
      aGender !== bGender
    ) {
      return 'Roommate gender preference conflict';
    }
  }

  // 1c. Check budget overlap
  const overlapStart = Math.max(a.housing.budgetMin, b.housing.budgetMin);
  const overlapEnd = Math.min(a.housing.budgetMax, b.housing.budgetMax);
  if (overlapStart > overlapEnd) {
    return 'Monthly budget ranges do not overlap';
  }

  return null;
}

/**
 * Computes similarity (0 to 1) for a single lifestyle trait between two profiles.
 */
export function computeTraitSimilarity(
  key: LifestyleTraitKey,
  aLife: ProfileLifestyle,
  bLife: ProfileLifestyle,
): number {
  if (key === 'cleanliness') {
    return Math.max(0, 1 - Math.abs(aLife.cleanliness - bLife.cleanliness) / 4);
  }

  const map = ORDINAL_INDEX[key];
  const idxA = map[String(aLife[key])];
  const idxB = map[String(bLife[key])];

  if (idxA === undefined || idxB === undefined) return 0;
  const diff = Math.abs(idxA - idxB);
  if (diff === 0) return 1;
  if (diff === 1) return 0.5;
  return 0;
}

/**
 * Step 2: Weighted score from viewer's perspective (0-100).
 */
function computeDirectionalScore(viewer: RoommateProfile, candidate: RoommateProfile): number {
  const keys = Object.keys(TRAIT_LABELS) as LifestyleTraitKey[];
  let weightedSum = 0;
  let totalWeight = 0;

  for (const key of keys) {
    const similarity = computeTraitSimilarity(key, viewer.lifestyle, candidate.lifestyle);
    const weight = viewer.importance?.[key] ?? 3;
    weightedSum += similarity * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return 0;
  return (weightedSum / totalWeight) * 100;
}

function buildTraitExplanation(
  key: LifestyleTraitKey,
  yourAnswer: string,
  theirAnswer: string,
  status: BreakdownStatus,
): string {
  const label = TRAIT_LABELS[key].toLowerCase();
  if (status === 'match') {
    return `You both selected ${yourAnswer.toLowerCase()} for ${label}.`;
  }
  if (status === 'partial') {
    return `Close fit on ${label}: you prefer ${yourAnswer.toLowerCase()}, while they prefer ${theirAnswer.toLowerCase()}.`;
  }
  return `Different expectations on ${label}: yours is ${yourAnswer.toLowerCase()} vs. their ${theirAnswer.toLowerCase()}.`;
}

function buildSummarySentence(breakdown: TraitBreakdownItem[], score: number): string {
  const matches = breakdown.filter((b) => b.status === 'match');
  const mismatches = breakdown.filter((b) => b.status === 'mismatch');

  const topMatches = matches
    .slice(0, 2)
    .map((m) => m.trait.toLowerCase())
    .join(' and ');

  const lead =
    score >= 80
      ? 'Great match'
      : score >= 60
        ? 'Solid match'
        : 'Mixed compatibility';

  if (matches.length > 0 && mismatches.length > 0) {
    return `${lead}: you align well on ${topMatches}. Worth discussing: ${mismatches[0].trait.toLowerCase()}.`;
  }
  if (matches.length > 0) {
    return `${lead}: you closely share habits around ${topMatches}.`;
  }
  if (mismatches.length > 0) {
    return `${lead}: you have differing preferences around ${mismatches
      .slice(0, 2)
      .map((m) => m.trait.toLowerCase())
      .join(' and ')}.`;
  }
  return `${lead} across your daily lifestyle preferences.`;
}

/**
 * Step 3 & 4: Full pairwise comparison returning mutual score, exclusion details,
 * and plain-English trait-by-trait breakdown.
 */
export function compareProfiles(
  currentProfile: RoommateProfile,
  otherProfile: RoommateProfile,
): MatchComparisonResult {
  const excludeReason = checkCompatibilityExclusion(currentProfile, otherProfile);
  const excluded = excludeReason !== null;

  const keys = Object.keys(TRAIT_LABELS) as LifestyleTraitKey[];
  const breakdown: TraitBreakdownItem[] = keys.map((key) => {
    const similarity = computeTraitSimilarity(
      key,
      currentProfile.lifestyle,
      otherProfile.lifestyle,
    );
    const status: BreakdownStatus =
      similarity >= 0.85 ? 'match' : similarity >= 0.45 ? 'partial' : 'mismatch';

    const yourAnswer = formatTraitAnswer(key, currentProfile.lifestyle[key]);
    const theirAnswer = formatTraitAnswer(key, otherProfile.lifestyle[key]);

    return {
      key,
      trait: TRAIT_LABELS[key],
      yourAnswer,
      theirAnswer,
      similarity,
      status,
      explanation: buildTraitExplanation(key, yourAnswer, theirAnswer, status),
    };
  });

  if (excluded) {
    return {
      userId: otherProfile.userId,
      score: 0,
      excluded: true,
      excludeReason,
      breakdown,
      summary: `Excluded: ${excludeReason}.`,
    };
  }

  const scoreAtoB = computeDirectionalScore(currentProfile, otherProfile);
  const scoreBtoA = computeDirectionalScore(otherProfile, currentProfile);
  const mutualScore = Math.round((scoreAtoB + scoreBtoA) / 2);

  return {
    userId: otherProfile.userId,
    score: mutualScore,
    excluded: false,
    excludeReason: null,
    breakdown,
    summary: buildSummarySentence(breakdown, mutualScore),
  };
}

/**
 * Computes and ranks all candidate matches for `currentProfile`.
 * Compatible (non-excluded) profiles appear first sorted by highest score.
 */
export function getMatches(
  currentProfile: RoommateProfile,
  allProfiles: RoommateProfile[],
): MatchComparisonResult[] {
  return allProfiles
    .filter((candidate) => candidate.userId !== currentProfile.userId && candidate.isComplete)
    .map((candidate) => compareProfiles(currentProfile, candidate))
    .sort((a, b) => {
      if (a.excluded !== b.excluded) return a.excluded ? 1 : -1;
      return b.score - a.score;
    });
}
