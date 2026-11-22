import assert from 'node:assert/strict';
import type { RoommateProfile } from '../services/types';
import { compareProfiles, getMatches } from './matching';

function makeProfile(overrides: Partial<RoommateProfile> = {}): RoommateProfile {
  const base: RoommateProfile = {
    userId: 'user_a',
    basics: {
      name: 'Student A',
      age: 20,
      gender: 'male',
      college: 'IIT Indore',
      courseYear: 'B.Tech 2nd Year',
      bio: 'Clean and quiet student.',
      avatar: 'initials',
    },
    housing: {
      budgetMin: 6000,
      budgetMax: 12000,
      preferredCity: 'Indore',
      preferredArea: 'Bhawarkua',
      moveInDate: '2026-12-01',
      roommateGenderPref: 'any',
      roommateCount: 'flexible',
    },
    lifestyle: {
      smoking: 'never',
      okayWithSmoker: 'no',
      drinking: 'never',
      okayWithDrinker: 'yes',
      sleepSchedule: 'early_bird',
      noiseLevel: 'quiet',
      headphoneUse: 'always',
      cleanliness: 5,
      guests: 'never',
      studyHabits: 'silence',
      diet: 'vegetarian',
      okayWithNonVegCooking: 'no',
      pets: 'likes_pets',
    },
    importance: {
      smoking: 3,
      drinking: 3,
      sleepSchedule: 3,
      noiseLevel: 3,
      headphoneUse: 3,
      cleanliness: 3,
      guests: 3,
      studyHabits: 3,
      diet: 3,
      pets: 3,
      roommateCount: 3,
    },
    dealBreakers: [],
    isComplete: true,
    isDemo: false,
    updatedAt: '2026-11-22T00:00:00.000Z',
  };

  return {
    ...base,
    ...overrides,
    basics: { ...base.basics, ...overrides.basics },
    housing: { ...base.housing, ...overrides.housing },
    lifestyle: { ...base.lifestyle, ...overrides.lifestyle },
    importance: { ...base.importance, ...overrides.importance },
  };
}

// 1. Perfect match
{
  const a = makeProfile({ userId: 'a' });
  const b = makeProfile({ userId: 'b' });
  const res = compareProfiles(a, b);
  assert.equal(res.excluded, false);
  assert.equal(res.score, 100);
  assert.ok(res.breakdown.every((item) => item.status === 'match' && item.similarity === 1));
}

// 2. Deal-breaker exclusion (smoker)
{
  const a = makeProfile({
    userId: 'a',
    dealBreakers: ['smoker'],
  });
  const b = makeProfile({
    userId: 'b',
    lifestyle: { ...makeProfile().lifestyle, smoking: 'occasionally' },
  });
  const res = compareProfiles(a, b);
  assert.equal(res.excluded, true);
  assert.equal(res.score, 0);
  assert.match(res.excludeReason || '', /smoking/i);
}

// 3. Budget non-overlap
{
  const a = makeProfile({
    userId: 'a',
    housing: { ...makeProfile().housing, budgetMin: 4000, budgetMax: 7000 },
  });
  const b = makeProfile({
    userId: 'b',
    housing: { ...makeProfile().housing, budgetMin: 10000, budgetMax: 16000 },
  });
  const res = compareProfiles(a, b);
  assert.equal(res.excluded, true);
  assert.match(res.excludeReason || '', /budget/i);
}

// 4. Gender preference conflict
{
  const a = makeProfile({
    userId: 'a',
    basics: { ...makeProfile().basics, gender: 'male' },
    housing: { ...makeProfile().housing, roommateGenderPref: 'same_gender' },
  });
  const b = makeProfile({
    userId: 'b',
    basics: { ...makeProfile().basics, gender: 'female' },
    housing: { ...makeProfile().housing, roommateGenderPref: 'any' },
  });
  const res = compareProfiles(a, b);
  assert.equal(res.excluded, true);
  assert.match(res.excludeReason || '', /gender/i);
}

// 5. Partial match with adjacent and mismatched traits + getMatches ordering
{
  const a = makeProfile({ userId: 'a' });
  const b = makeProfile({
    userId: 'b',
    lifestyle: {
      ...makeProfile().lifestyle,
      noiseLevel: 'moderate', // adjacent (0.5)
      sleepSchedule: 'night_owl', // opposite (0)
      cleanliness: 3, // diff 2 => 1 - 2/4 = 0.5
    },
  });
  const c = makeProfile({ userId: 'c' }); // perfect 100%

  const resAB = compareProfiles(a, b);
  assert.equal(resAB.excluded, false);
  assert.ok(resAB.score > 50 && resAB.score < 100);
  const noiseItem = resAB.breakdown.find((item) => item.key === 'noiseLevel');
  const sleepItem = resAB.breakdown.find((item) => item.key === 'sleepSchedule');
  assert.equal(noiseItem?.status, 'partial');
  assert.equal(sleepItem?.status, 'mismatch');

  const ranked = getMatches(a, [b, c]);
  assert.equal(ranked[0].userId, 'c');
  assert.equal(ranked[1].userId, 'b');
}

// 6. Roommate count exact match (e.g. 2 vs 2)
{
  const a = makeProfile({
    userId: 'a',
    housing: { ...makeProfile().housing, roommateCount: 2 },
  });
  const b = makeProfile({
    userId: 'b',
    housing: { ...makeProfile().housing, roommateCount: 2 },
  });
  const res = compareProfiles(a, b);
  const item = res.breakdown.find((row) => row.key === 'roommateCount');
  assert.equal(res.excluded, false);
  assert.equal(res.score, 100);
  assert.equal(item?.similarity, 1);
  assert.equal(item?.status, 'match');
  assert.match(item?.explanation || '', /both prefer 2 roommates/i);
}

// 7. Roommate count flexible match (0.8 similarity against any numeric count & legacy missing defaults to flexible)
{
  const a = makeProfile({
    userId: 'a',
    housing: { ...makeProfile().housing, roommateCount: 'flexible' },
  });
  const b = makeProfile({
    userId: 'b',
    housing: { ...makeProfile().housing, roommateCount: 3 },
  });
  const res = compareProfiles(a, b);
  const item = res.breakdown.find((row) => row.key === 'roommateCount');
  assert.equal(item?.similarity, 0.8);
  assert.equal(item?.status, 'partial');
  assert.match(item?.explanation || '', /flexible.*3 roommates/i);

  // Legacy profile missing roommateCount defaults cleanly to "flexible"
  const legacyProfile = makeProfile({ userId: 'legacy' });
  delete (legacyProfile.housing as { roommateCount?: unknown }).roommateCount;
  const legacyVsThree = compareProfiles(legacyProfile, b);
  const legacyItem = legacyVsThree.breakdown.find((row) => row.key === 'roommateCount');
  assert.equal(legacyItem?.yourAnswer, 'Flexible (any number)');
  assert.equal(legacyItem?.similarity, 0.8);
}

// 8. Roommate count adjacent (diff = 1 -> 0.5) and far apart (diff >= 2 -> 0) + deal-breaker
{
  const two = makeProfile({
    userId: 'two',
    housing: { ...makeProfile().housing, roommateCount: 2 },
  });
  const three = makeProfile({
    userId: 'three',
    housing: { ...makeProfile().housing, roommateCount: 3 },
  });
  const resAdjacent = compareProfiles(two, three);
  const adjItem = resAdjacent.breakdown.find((row) => row.key === 'roommateCount');
  assert.equal(adjItem?.similarity, 0.5);
  assert.equal(adjItem?.status, 'partial');
  assert.match(adjItem?.explanation || '', /You prefer 2 roommates, they prefer 3 roommates/i);

  const one = makeProfile({
    userId: 'one',
    housing: { ...makeProfile().housing, roommateCount: 1 },
  });
  const fourPlus = makeProfile({
    userId: 'four',
    housing: { ...makeProfile().housing, roommateCount: 4 },
  });
  const resFar = compareProfiles(one, fourPlus);
  const farItem = resFar.breakdown.find((row) => row.key === 'roommateCount');
  assert.equal(farItem?.similarity, 0);
  assert.equal(farItem?.status, 'mismatch');
  assert.match(farItem?.explanation || '', /You prefer 1 roommate, they prefer 4\+ roommates/i);

  const strictTwo = makeProfile({
    userId: 'strict_two',
    housing: { ...makeProfile().housing, roommateCount: 2 },
    dealBreakers: ['different_group_size'],
  });
  const excludedRes = compareProfiles(strictTwo, fourPlus);
  assert.equal(excludedRes.excluded, true);
  assert.match(excludedRes.excludeReason || '', /group size/i);
}

console.log('All matching engine tests passed (8/8).');
