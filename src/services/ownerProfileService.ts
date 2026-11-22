import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { DEMO_OWNERS } from '../data/demoListings';
import { auth, db, handleFirestoreError, isFirebaseConfigured, OperationType } from './firebase';
import type { OwnerPublicProfile, StudentUser } from './types';

const OWNER_PROFILES_KEY = 'roomie_owner_profiles_v1';
const DEMO_OWNERS_KEY = 'roomie_demo_owners_v1';

function readMap(key: string): Record<string, OwnerPublicProfile> {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, OwnerPublicProfile>;
  } catch {
    return {};
  }
}

function writeMap(key: string, map: Record<string, OwnerPublicProfile>): void {
  window.localStorage.setItem(key, JSON.stringify(map));
}

function isPermissionDenied(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = 'code' in error ? String((error as { code: unknown }).code) : '';
  const msg = error instanceof Error ? error.message.toLowerCase() : '';
  return code === 'permission-denied' || msg.includes('missing or insufficient permissions');
}

function stripDemoSeed(seed: (typeof DEMO_OWNERS)[number]): OwnerPublicProfile {
  return {
    userId: seed.userId,
    name: seed.name,
    city: seed.city,
    bio: seed.bio,
    avatar: seed.avatar,
    isDemo: true,
    updatedAt: seed.updatedAt,
  };
}

function normalizeOwnerProfile(
  data: Record<string, unknown>,
  fallbackUserId: string,
): OwnerPublicProfile {
  const updatedAtRaw = data.updatedAt as { toDate?: () => Date } | string | undefined;
  return {
    userId: String(data.userId || fallbackUserId),
    name: String(data.name || 'Property Owner'),
    city: String(data.city || ''),
    bio: String(data.bio || ''),
    avatar: String(data.avatar || 'initials'),
    isDemo: Boolean(data.isDemo),
    updatedAt:
      updatedAtRaw && typeof updatedAtRaw === 'object' && typeof updatedAtRaw.toDate === 'function'
        ? updatedAtRaw.toDate().toISOString()
        : String(updatedAtRaw || new Date().toISOString()),
  };
}

let demoOwnersSeedPromise: Promise<void> | null = null;
let demoOwnersSeeded = false;

export async function seedDemoOwners(): Promise<void> {
  const existing = readMap(DEMO_OWNERS_KEY);
  if (Object.keys(existing).length < DEMO_OWNERS.length) {
    const map: Record<string, OwnerPublicProfile> = {};
    DEMO_OWNERS.forEach((o) => {
      map[o.userId] = stripDemoSeed(o);
    });
    writeMap(DEMO_OWNERS_KEY, map);
  }

  if (!isFirebaseConfigured || !db || !auth?.currentUser || demoOwnersSeeded) {
    return;
  }

  if (demoOwnersSeedPromise) {
    return demoOwnersSeedPromise;
  }

  const firestoreDb = db;
  demoOwnersSeedPromise = (async () => {
    try {
      const snap = await getDocs(collection(firestoreDb, 'ownerProfiles'));
      const existingIds = new Set<string>();
      snap.forEach((d) => existingIds.add(d.id));

      const missing = DEMO_OWNERS.filter((o) => !existingIds.has(o.userId));
      if (missing.length > 0) {
        await Promise.all(
          missing.map((owner) =>
            setDoc(doc(firestoreDb, 'ownerProfiles', owner.userId), {
              ...stripDemoSeed(owner),
              updatedAt: serverTimestamp(),
            }),
          ),
        );
      }
      demoOwnersSeeded = true;
    } catch (error) {
      if (isPermissionDenied(error)) {
        handleFirestoreError(error, OperationType.WRITE, 'ownerProfiles');
      }
    } finally {
      demoOwnersSeedPromise = null;
    }
  })();

  return demoOwnersSeedPromise;
}

export async function ensureDemoOwnerInFirestore(ownerId: string): Promise<void> {
  const demo = DEMO_OWNERS.find((o) => o.userId === ownerId);
  if (!demo) return;
  if (!isFirebaseConfigured || !db || !auth?.currentUser) return;

  const path = `ownerProfiles/${ownerId}`;
  const ref = doc(db, 'ownerProfiles', ownerId);
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        ...stripDemoSeed(demo),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    if (isPermissionDenied(error)) {
      try {
        const recheck = await getDoc(ref);
        if (recheck.exists() && recheck.data().isDemo === true) return;
      } catch {
        // Ignore
      }
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }
}

export async function ensureOwnerPublicProfileOnSignUp(user: StudentUser): Promise<OwnerPublicProfile> {
  const payload: OwnerPublicProfile = {
    userId: user.uid,
    name: user.name.trim().slice(0, 80),
    city: user.city.trim().slice(0, 80),
    bio: '',
    avatar: 'initials',
    isDemo: false,
    updatedAt: new Date().toISOString(),
  };

  const localMap = readMap(OWNER_PROFILES_KEY);
  localMap[user.uid] = payload;
  writeMap(OWNER_PROFILES_KEY, localMap);

  if (isFirebaseConfigured && db && auth?.currentUser && auth.currentUser.uid === user.uid) {
    const path = `ownerProfiles/${user.uid}`;
    try {
      await setDoc(doc(db, 'ownerProfiles', user.uid), {
        ...payload,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      if (isPermissionDenied(error)) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
    }
  }

  return payload;
}

export async function getOwnerPublicProfile(userId: string): Promise<OwnerPublicProfile | null> {
  if (!userId) return null;
  await seedDemoOwners();

  const demoMap = readMap(DEMO_OWNERS_KEY);
  if (demoMap[userId]) return demoMap[userId];

  const localMap = readMap(OWNER_PROFILES_KEY);

  if (isFirebaseConfigured && db && auth?.currentUser) {
    const path = `ownerProfiles/${userId}`;
    try {
      const snap = await getDoc(doc(db, 'ownerProfiles', userId));
      if (snap.exists()) {
        const normalized = normalizeOwnerProfile(snap.data() as Record<string, unknown>, userId);
        localMap[userId] = normalized;
        writeMap(OWNER_PROFILES_KEY, localMap);
        return normalized;
      }
    } catch (error) {
      if (isPermissionDenied(error)) {
        handleFirestoreError(error, OperationType.GET, path);
      }
    }
  }

  return localMap[userId] || null;
}

export async function getAllOwnerPublicProfiles(): Promise<OwnerPublicProfile[]> {
  await seedDemoOwners();

  const merged = new Map<string, OwnerPublicProfile>();
  const demoMap = readMap(DEMO_OWNERS_KEY);
  Object.values(demoMap).forEach((o) => merged.set(o.userId, o));

  const localMap = readMap(OWNER_PROFILES_KEY);
  Object.values(localMap).forEach((o) => merged.set(o.userId, o));

  if (isFirebaseConfigured && db && auth?.currentUser) {
    try {
      const snap = await getDocs(collection(db, 'ownerProfiles'));
      snap.forEach((docSnap) => {
        const normalized = normalizeOwnerProfile(
          docSnap.data() as Record<string, unknown>,
          docSnap.id,
        );
        merged.set(normalized.userId, normalized);
      });
    } catch (error) {
      if (isPermissionDenied(error)) {
        handleFirestoreError(error, OperationType.LIST, 'ownerProfiles');
      }
    }
  }

  return Array.from(merged.values());
}

export async function saveOwnerPublicProfile(
  userId: string,
  input: Pick<OwnerPublicProfile, 'name' | 'city' | 'bio' | 'avatar'>,
): Promise<OwnerPublicProfile> {
  const sanitized: OwnerPublicProfile = {
    userId,
    name: input.name.trim().slice(0, 80),
    city: input.city.trim().slice(0, 80),
    bio: input.bio.trim().slice(0, 300),
    avatar: input.avatar || 'initials',
    isDemo: false,
    updatedAt: new Date().toISOString(),
  };

  if (isFirebaseConfigured && db && auth?.currentUser && auth.currentUser.uid === userId) {
    const path = `ownerProfiles/${userId}`;
    try {
      await setDoc(doc(db, 'ownerProfiles', userId), {
        ...sanitized,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      if (isPermissionDenied(error)) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
      const msg = error instanceof Error ? error.message.toLowerCase() : '';
      if (!msg.includes('offline') && !msg.includes('unavailable')) {
        throw error;
      }
    }
  }

  const localMap = readMap(OWNER_PROFILES_KEY);
  localMap[userId] = sanitized;
  writeMap(OWNER_PROFILES_KEY, localMap);

  return sanitized;
}

export async function deleteOwnerPublicProfile(userId: string): Promise<void> {
  const localMap = readMap(OWNER_PROFILES_KEY);
  delete localMap[userId];
  writeMap(OWNER_PROFILES_KEY, localMap);

  if (isFirebaseConfigured && db && auth?.currentUser && auth.currentUser.uid === userId) {
    const path = `ownerProfiles/${userId}`;
    try {
      await deleteDoc(doc(db, 'ownerProfiles', userId));
    } catch (error) {
      if (isPermissionDenied(error)) {
        handleFirestoreError(error, OperationType.DELETE, path);
      }
    }
  }
}

export function getDemoOwnerPhone(ownerId: string): string | undefined {
  return DEMO_OWNERS.find((o) => o.userId === ownerId)?.demoPhone;
}
