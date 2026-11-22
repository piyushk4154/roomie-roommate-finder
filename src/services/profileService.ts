import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { DEMO_PROFILES } from '../data/demoProfiles';
import { normalizeRoommateCountPref } from '../utils/matching';
import { auth, db, handleFirestoreError, isFirebaseConfigured, OperationType } from './firebase';
import type {
  ProfileBasics,
  ProfileHousing,
  ProfileImportance,
  ProfileLifestyle,
  RoommateProfile,
} from './types';

const PROFILES_KEY = 'roomie_profiles_v1';
const DEMO_SEEDED_KEY = 'roomie_demo_profiles_v1';
const DRAFT_PREFIX = 'roomie_profile_draft_v1_';

export interface ProfileDraft {
  step: number;
  basics: ProfileBasics;
  housing: ProfileHousing;
  lifestyle: ProfileLifestyle;
  importance: ProfileImportance;
  dealBreakers: RoommateProfile['dealBreakers'];
  savedAt: string;
}

export function createDefaultProfileDraft(
  defaults?: Partial<{ name: string; college: string; city: string }>,
): ProfileDraft {
  return {
    step: 1,
    basics: {
      name: defaults?.name || '',
      age: 20,
      gender: 'prefer_not_to_say',
      college: defaults?.college || '',
      courseYear: '',
      bio: '',
      avatar: 'initials',
    },
    housing: {
      budgetMin: 6000,
      budgetMax: 14000,
      preferredCity: defaults?.city || '',
      preferredArea: '',
      moveInDate: '2026-12-01',
      roommateGenderPref: 'any',
      roommateCount: 'flexible',
    },
    lifestyle: {
      smoking: 'never',
      okayWithSmoker: 'no',
      drinking: 'never',
      okayWithDrinker: 'yes',
      sleepSchedule: 'flexible',
      noiseLevel: 'quiet',
      headphoneUse: 'always',
      cleanliness: 4,
      guests: 'sometimes',
      studyHabits: 'silence',
      diet: 'vegetarian',
      okayWithNonVegCooking: 'yes',
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
    savedAt: new Date().toISOString(),
  };
}

function readLocalMap(key: string): Record<string, RoommateProfile> {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, RoommateProfile>;
  } catch {
    return {};
  }
}

function writeLocalMap(key: string, map: Record<string, RoommateProfile>): void {
  window.localStorage.setItem(key, JSON.stringify(map));
}

function isPermissionDenied(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = 'code' in error ? String((error as { code: unknown }).code) : '';
  const msg = error instanceof Error ? error.message.toLowerCase() : '';
  return code === 'permission-denied' || msg.includes('missing or insufficient permissions');
}

export function saveProfileDraft(userId: string, draft: ProfileDraft): void {
  try {
    window.localStorage.setItem(
      `${DRAFT_PREFIX}${userId}`,
      JSON.stringify({ ...draft, savedAt: new Date().toISOString() }),
    );
  } catch {
    // Ignore storage quota errors
  }
}

export function loadProfileDraft(userId: string): ProfileDraft | null {
  try {
    const raw = window.localStorage.getItem(`${DRAFT_PREFIX}${userId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ProfileDraft;
    const defaults = createDefaultProfileDraft();
    return {
      ...defaults,
      ...parsed,
      basics: { ...defaults.basics, ...(parsed.basics || {}) },
      housing: {
        ...defaults.housing,
        ...(parsed.housing || {}),
        roommateCount: normalizeRoommateCountPref(parsed.housing?.roommateCount),
      },
      lifestyle: { ...defaults.lifestyle, ...(parsed.lifestyle || {}) },
      importance: {
        ...defaults.importance,
        ...(parsed.importance || {}),
        roommateCount: parsed.importance?.roommateCount ?? 3,
      },
      dealBreakers: Array.isArray(parsed.dealBreakers) ? parsed.dealBreakers : [],
    };
  } catch {
    return null;
  }
}

export function clearProfileDraft(userId: string): void {
  try {
    window.localStorage.removeItem(`${DRAFT_PREFIX}${userId}`);
  } catch {
    // Ignore
  }
}

let firestoreDemoSeedPromise: Promise<void> | null = null;
let firestoreDemoSeeded = false;

export async function ensureDemoProfileInFirestore(userId: string): Promise<void> {
  const demoProfile = DEMO_PROFILES.find((p) => p.userId === userId);
  if (!demoProfile) return;
  if (!isFirebaseConfigured || !db || !auth?.currentUser) return;

  if (firestoreDemoSeedPromise) {
    await firestoreDemoSeedPromise;
  }

  const path = `profiles/${userId}`;
  const ref = doc(db, 'profiles', userId);
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        ...demoProfile,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    if (isPermissionDenied(error)) {
      // Check if another concurrent request just created the demo doc before throwing
      try {
        const recheck = await getDoc(ref);
        if (recheck.exists() && recheck.data().isDemo === true) {
          return;
        }
      } catch {
        // Ignore recheck failure and report original permission error
      }
      console.error('Firestore demo profile seed permission error:', { path, userId, error });
      handleFirestoreError(error, OperationType.WRITE, path);
    }
    // Ignore offline/unavailable errors so localStorage fallback keeps working
  }
}

const DEMO_PROFILE_MAP = new Map(DEMO_PROFILES.map((p) => [p.userId, p]));

function normalizeWeight(value: unknown, fallback = 3): 1 | 2 | 3 | 4 | 5 {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5) {
    return value as 1 | 2 | 3 | 4 | 5;
  }
  return fallback as 1 | 2 | 3 | 4 | 5;
}

function normalizeProfile(data: Record<string, unknown>, fallbackUserId: string): RoommateProfile {
  const userId = String(data.userId || fallbackUserId);
  const isDemo = Boolean(data.isDemo);
  const demoFallback = isDemo ? DEMO_PROFILE_MAP.get(userId) : undefined;
  const rawHousing = (data.housing || {}) as Partial<ProfileHousing>;
  const rawImportance = (data.importance || {}) as Partial<ProfileImportance>;

  const roommateCount =
    rawHousing.roommateCount !== undefined
      ? normalizeRoommateCountPref(rawHousing.roommateCount)
      : demoFallback?.housing.roommateCount ?? 'flexible';

  const updatedAtRaw = data.updatedAt as { toDate?: () => Date } | string | undefined;

  return {
    userId,
    basics: data.basics as ProfileBasics,
    housing: {
      ...(rawHousing as ProfileHousing),
      roommateCount,
    },
    lifestyle: data.lifestyle as ProfileLifestyle,
    importance: {
      ...(rawImportance as ProfileImportance),
      roommateCount: normalizeWeight(
        rawImportance.roommateCount,
        demoFallback?.importance.roommateCount ?? 3,
      ),
    },
    dealBreakers: ((data.dealBreakers || []) as RoommateProfile['dealBreakers']),
    isComplete: Boolean(data.isComplete),
    isDemo,
    updatedAt:
      updatedAtRaw && typeof updatedAtRaw === 'object' && typeof updatedAtRaw.toDate === 'function'
        ? updatedAtRaw.toDate().toISOString()
        : String(updatedAtRaw || new Date().toISOString()),
  };
}

export async function seedDemoProfiles(): Promise<void> {
  const existing = readLocalMap(DEMO_SEEDED_KEY);
  const needsLocalRefresh =
    Object.keys(existing).length < DEMO_PROFILES.length ||
    Object.values(existing).some(
      (p) =>
        p.housing?.roommateCount === undefined || p.importance?.roommateCount === undefined,
    );
  if (needsLocalRefresh) {
    const map: Record<string, RoommateProfile> = {};
    for (const profile of DEMO_PROFILES) {
      map[profile.userId] = profile;
    }
    writeLocalMap(DEMO_SEEDED_KEY, map);
  }

  if (!isFirebaseConfigured || !db || !auth?.currentUser || firestoreDemoSeeded) {
    return;
  }

  if (firestoreDemoSeedPromise) {
    return firestoreDemoSeedPromise;
  }

  const firestoreDb = db;
  firestoreDemoSeedPromise = (async () => {
    try {
      const q = query(collection(firestoreDb, 'profiles'), where('isComplete', '==', true));
      const snap = await getDocs(q);
      const existingIds = new Set<string>();
      snap.forEach((d) => existingIds.add(d.id));

      const missing = DEMO_PROFILES.filter((p) => !existingIds.has(p.userId));
      if (missing.length > 0) {
        await Promise.all(
          missing.map((profile) =>
            setDoc(doc(firestoreDb, 'profiles', profile.userId), {
              ...profile,
              updatedAt: serverTimestamp(),
            }),
          ),
        );
      }
      firestoreDemoSeeded = true;
    } catch (error) {
      if (isPermissionDenied(error)) {
        console.error('Firestore demo profiles seeding failed:', error);
        handleFirestoreError(error, OperationType.WRITE, 'profiles');
      }
      // Allow retry if it failed due to transient/offline error
    } finally {
      firestoreDemoSeedPromise = null;
    }
  })();

  return firestoreDemoSeedPromise;
}

export async function getProfile(userId: string): Promise<RoommateProfile | null> {
  if (!userId) return null;

  await seedDemoProfiles();
  const demoMap = readLocalMap(DEMO_SEEDED_KEY);
  if (demoMap[userId]) {
    return demoMap[userId];
  }

  const localProfiles = readLocalMap(PROFILES_KEY);

  if (isFirebaseConfigured && db && auth?.currentUser) {
    const path = `profiles/${userId}`;
    try {
      const snap = await getDoc(doc(db, 'profiles', userId));
      if (snap.exists()) {
        const data = snap.data() as Record<string, unknown>;
        const normalized = normalizeProfile(data, userId);
        localProfiles[userId] = normalized;
        writeLocalMap(PROFILES_KEY, localProfiles);
        return normalized;
      }
    } catch (error) {
      if (isPermissionDenied(error)) {
        handleFirestoreError(error, OperationType.GET, path);
      }
      // Fall back to localStorage copy when offline
      if (localProfiles[userId]) {
        return normalizeProfile(localProfiles[userId] as unknown as Record<string, unknown>, userId);
      }
    }
  }

  return localProfiles[userId]
    ? normalizeProfile(localProfiles[userId] as unknown as Record<string, unknown>, userId)
    : null;
}

const profileRefreshListeners = new Set<() => void>();

export function subscribeToProfileRefresh(listener: () => void): () => void {
  profileRefreshListeners.add(listener);
  return () => {
    profileRefreshListeners.delete(listener);
  };
}

function notifyProfileRefresh(): void {
  profileRefreshListeners.forEach((listener) => listener());
}

export async function saveProfile(
  userId: string,
  input: Omit<RoommateProfile, 'userId' | 'isDemo' | 'updatedAt'>,
): Promise<RoommateProfile> {
  const sanitized: Omit<RoommateProfile, 'updatedAt'> = {
    userId,
    basics: {
      name: input.basics.name.trim().slice(0, 80),
      age: Math.min(35, Math.max(17, Math.round(input.basics.age))),
      gender: input.basics.gender,
      college: input.basics.college.trim().slice(0, 120),
      courseYear: input.basics.courseYear.trim().slice(0, 80),
      bio: input.basics.bio.trim().slice(0, 200),
      avatar: input.basics.avatar || 'initials',
    },
    housing: {
      budgetMin: Math.min(40000, Math.max(2000, Math.round(input.housing.budgetMin))),
      budgetMax: Math.min(
        40000,
        Math.max(
          Math.min(40000, Math.max(2000, Math.round(input.housing.budgetMin))),
          Math.round(input.housing.budgetMax),
        ),
      ),
      preferredCity: input.housing.preferredCity.trim().slice(0, 80),
      preferredArea: input.housing.preferredArea.trim().slice(0, 120),
      moveInDate: input.housing.moveInDate.slice(0, 20),
      roommateGenderPref: input.housing.roommateGenderPref,
      roommateCount: normalizeRoommateCountPref(input.housing.roommateCount),
    },
    lifestyle: input.lifestyle,
    importance: {
      ...input.importance,
      roommateCount: normalizeWeight(input.importance?.roommateCount, 3),
    },
    dealBreakers: input.dealBreakers.slice(0, 9),
    isComplete: input.isComplete,
    isDemo: false,
  };

  const nowIso = new Date().toISOString();
  const savedLocal: RoommateProfile = {
    ...sanitized,
    updatedAt: nowIso,
  };

  if (isFirebaseConfigured && db && auth?.currentUser && auth.currentUser.uid === userId) {
    const path = `profiles/${userId}`;
    const firestorePayload = {
      ...sanitized,
      updatedAt: serverTimestamp(),
    };
    try {
      await setDoc(doc(db, 'profiles', userId), firestorePayload);
    } catch (error) {
      console.error('Firestore saveProfile failed:', {
        path,
        payload: { ...sanitized, updatedAt: 'serverTimestamp()' },
        authUid: auth.currentUser?.uid ?? null,
        error,
      });
      if (isPermissionDenied(error)) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
      const msg = error instanceof Error ? error.message.toLowerCase() : '';
      if (!msg.includes('offline') && !msg.includes('unavailable')) {
        throw error;
      }
    }
  }

  const localProfiles = readLocalMap(PROFILES_KEY);
  localProfiles[userId] = savedLocal;
  writeLocalMap(PROFILES_KEY, localProfiles);
  clearProfileDraft(userId);
  notifyProfileRefresh();

  return savedLocal;
}

export async function getAllMatchableProfiles(): Promise<RoommateProfile[]> {
  await seedDemoProfiles();

  const merged = new Map<string, RoommateProfile>();

  const demoMap = readLocalMap(DEMO_SEEDED_KEY);
  Object.values(demoMap).forEach((profile) => {
    if (profile.isComplete) {
      merged.set(profile.userId, profile);
    }
  });

  const localProfiles = readLocalMap(PROFILES_KEY);
  Object.values(localProfiles).forEach((profile) => {
    if (profile.isComplete) {
      merged.set(
        profile.userId,
        normalizeProfile(profile as unknown as Record<string, unknown>, profile.userId),
      );
    }
  });

  if (isFirebaseConfigured && db && auth?.currentUser) {
    const path = 'profiles';
    try {
      const q = query(collection(db, 'profiles'), where('isComplete', '==', true));
      const snap = await getDocs(q);
      snap.forEach((docSnap) => {
        const data = docSnap.data() as Record<string, unknown>;
        const profile = normalizeProfile(data, docSnap.id);
        merged.set(profile.userId, profile);
      });
    } catch (error) {
      if (isPermissionDenied(error)) {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    }
  }

  return Array.from(merged.values());
}

export async function deleteLocalAndFirestoreProfile(userId: string): Promise<void> {
  clearProfileDraft(userId);
  const localProfiles = readLocalMap(PROFILES_KEY);
  delete localProfiles[userId];
  writeLocalMap(PROFILES_KEY, localProfiles);

  if (isFirebaseConfigured && db && auth?.currentUser && auth.currentUser.uid === userId) {
    const path = `profiles/${userId}`;
    try {
      await deleteDoc(doc(db, 'profiles', userId));
    } catch (error) {
      if (isPermissionDenied(error)) {
        handleFirestoreError(error, OperationType.DELETE, path);
      }
    }
  }
}
