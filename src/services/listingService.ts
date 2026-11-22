import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { DEMO_LISTINGS } from '../data/demoListings';
import { isSafeImageUrl } from '../utils/validation';
import { auth, db, handleFirestoreError, isFirebaseConfigured, OperationType } from './firebase';
import { ensureDemoOwnerInFirestore, seedDemoOwners } from './ownerProfileService';
import type {
  FurnishedStatus,
  Listing,
  ListingAddress,
  ListingAmenity,
  ListingGenderAllowed,
  ListingHouseRules,
  ListingStatus,
  PropertyType,
} from './types';

const LISTINGS_KEY = 'roomie_listings_v1';
const DEMO_LISTINGS_KEY = 'roomie_demo_listings_v1';
const DRAFT_PREFIX = 'roomie_listing_draft_v1_';

export interface ListingDraft {
  step: number;
  title: string;
  propertyType: PropertyType;
  address: ListingAddress;
  nearbyLandmark: string;
  rentPerMonth: number;
  securityDeposit: number;
  totalBeds: number;
  availableBeds: number;
  genderAllowed: ListingGenderAllowed;
  furnished: FurnishedStatus;
  availableFrom: string;
  amenities: ListingAmenity[];
  houseRules: ListingHouseRules;
  description: string;
  photoUrls: string[];
  authorizedConfirmed: boolean;
  status: ListingStatus;
  savedAt: string;
}

export function createDefaultListingDraft(defaultCity = ''): ListingDraft {
  return {
    step: 1,
    title: '',
    propertyType: 'pg',
    address: {
      street: '',
      area: '',
      city: defaultCity,
      pincode: '',
    },
    nearbyLandmark: '',
    rentPerMonth: 8000,
    securityDeposit: 8000,
    totalBeds: 2,
    availableBeds: 1,
    genderAllowed: 'any',
    furnished: 'furnished',
    availableFrom: '2026-12-01',
    amenities: ['wifi', 'geyser'],
    houseRules: {
      smokingAllowed: false,
      drinkingAllowed: false,
      guestsAllowed: true,
      curfewTime: '11:00 PM',
      vegOnly: false,
      petsAllowed: false,
    },
    description: '',
    photoUrls: [],
    authorizedConfirmed: false,
    status: 'active',
    savedAt: new Date().toISOString(),
  };
}

export function saveListingDraft(userId: string, draft: ListingDraft): void {
  try {
    window.localStorage.setItem(
      `${DRAFT_PREFIX}${userId}`,
      JSON.stringify({ ...draft, savedAt: new Date().toISOString() }),
    );
  } catch {
    // Ignore storage quota errors
  }
}

export function loadListingDraft(userId: string): ListingDraft | null {
  try {
    const raw = window.localStorage.getItem(`${DRAFT_PREFIX}${userId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ListingDraft>;
    const defaults = createDefaultListingDraft();
    return {
      ...defaults,
      ...parsed,
      address: { ...defaults.address, ...(parsed.address || {}) },
      houseRules: { ...defaults.houseRules, ...(parsed.houseRules || {}) },
      amenities: Array.isArray(parsed.amenities) ? parsed.amenities : defaults.amenities,
      photoUrls: Array.isArray(parsed.photoUrls) ? parsed.photoUrls : [],
    };
  } catch {
    return null;
  }
}

export function clearListingDraft(userId: string): void {
  try {
    window.localStorage.removeItem(`${DRAFT_PREFIX}${userId}`);
  } catch {
    // Ignore
  }
}

function readLocalMap(key: string): Record<string, Listing> {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, Listing>;
  } catch {
    return {};
  }
}

function writeLocalMap(key: string, map: Record<string, Listing>): void {
  window.localStorage.setItem(key, JSON.stringify(map));
}

function isPermissionDenied(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = 'code' in error ? String((error as { code: unknown }).code) : '';
  const msg = error instanceof Error ? error.message.toLowerCase() : '';
  return code === 'permission-denied' || msg.includes('missing or insufficient permissions');
}

function normalizeListing(data: Record<string, unknown>, fallbackId: string): Listing {
  const createdAtRaw = data.createdAt as { toDate?: () => Date } | string | undefined;
  const updatedAtRaw = data.updatedAt as { toDate?: () => Date } | string | undefined;
  const addr = (data.address || {}) as Partial<ListingAddress>;
  const rules = (data.houseRules || {}) as Partial<ListingHouseRules>;

  return {
    id: String(data.id || fallbackId),
    ownerId: String(data.ownerId || ''),
    ownerName: String(data.ownerName || 'Property Owner'),
    title: String(data.title || 'Untitled property'),
    propertyType: (data.propertyType as PropertyType) || 'pg',
    address: {
      street: String(addr.street || ''),
      area: String(addr.area || ''),
      city: String(addr.city || ''),
      pincode: String(addr.pincode || ''),
    },
    rentPerMonth: Number(data.rentPerMonth || 0),
    securityDeposit: Number(data.securityDeposit || 0),
    totalBeds: Number(data.totalBeds || 1),
    availableBeds: Number(data.availableBeds ?? 0),
    genderAllowed: (data.genderAllowed as ListingGenderAllowed) || 'any',
    furnished: (data.furnished as FurnishedStatus) || 'furnished',
    amenities: Array.isArray(data.amenities) ? (data.amenities as ListingAmenity[]) : [],
    houseRules: {
      smokingAllowed: Boolean(rules.smokingAllowed),
      drinkingAllowed: Boolean(rules.drinkingAllowed),
      guestsAllowed: Boolean(rules.guestsAllowed),
      curfewTime: String(rules.curfewTime || ''),
      vegOnly: Boolean(rules.vegOnly),
      petsAllowed: Boolean(rules.petsAllowed),
    },
    nearbyLandmark: String(data.nearbyLandmark || ''),
    availableFrom: String(data.availableFrom || ''),
    description: String(data.description || ''),
    photoUrls: Array.isArray(data.photoUrls)
      ? (data.photoUrls as string[]).filter((u) => typeof u === 'string' && isSafeImageUrl(u))
      : [],
    authorizedConfirmed: Boolean(data.authorizedConfirmed),
    status: (data.status as ListingStatus) || 'active',
    isDemo: Boolean(data.isDemo),
    createdAt:
      createdAtRaw && typeof createdAtRaw === 'object' && typeof createdAtRaw.toDate === 'function'
        ? createdAtRaw.toDate().toISOString()
        : String(createdAtRaw || new Date().toISOString()),
    updatedAt:
      updatedAtRaw && typeof updatedAtRaw === 'object' && typeof updatedAtRaw.toDate === 'function'
        ? updatedAtRaw.toDate().toISOString()
        : String(updatedAtRaw || new Date().toISOString()),
  };
}

let demoSeedPromise: Promise<void> | null = null;
let demoSeeded = false;

export async function seedDemoListings(): Promise<void> {
  await seedDemoOwners();

  const existing = readLocalMap(DEMO_LISTINGS_KEY);
  if (Object.keys(existing).length < DEMO_LISTINGS.length) {
    const map: Record<string, Listing> = {};
    DEMO_LISTINGS.forEach((l) => {
      map[l.id] = l;
    });
    writeLocalMap(DEMO_LISTINGS_KEY, map);
  }

  if (!isFirebaseConfigured || !db || !auth?.currentUser || demoSeeded) {
    return;
  }

  if (demoSeedPromise) {
    return demoSeedPromise;
  }

  const firestoreDb = db;
  demoSeedPromise = (async () => {
    try {
      const q = query(collection(firestoreDb, 'listings'), where('status', '==', 'active'));
      const snap = await getDocs(q);
      const existingIds = new Set<string>();
      snap.forEach((d) => existingIds.add(d.id));

      const missing = DEMO_LISTINGS.filter((l) => !existingIds.has(l.id));
      if (missing.length > 0) {
        await Promise.all(
          missing.map((listing) =>
            setDoc(doc(firestoreDb, 'listings', listing.id), {
              ...listing,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            }),
          ),
        );
      }
      demoSeeded = true;
    } catch (error) {
      if (isPermissionDenied(error)) {
        console.error('Firestore demo listings seed failed:', error);
        handleFirestoreError(error, OperationType.WRITE, 'listings');
      }
    } finally {
      demoSeedPromise = null;
    }
  })();

  return demoSeedPromise;
}

export async function ensureDemoListingInFirestore(listingId: string): Promise<void> {
  const demo = DEMO_LISTINGS.find((l) => l.id === listingId);
  if (!demo) return;
  await ensureDemoOwnerInFirestore(demo.ownerId);

  if (!isFirebaseConfigured || !db || !auth?.currentUser) return;

  const path = `listings/${listingId}`;
  const ref = doc(db, 'listings', listingId);
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        ...demo,
        createdAt: serverTimestamp(),
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

const listingRefreshListeners = new Set<() => void>();

export function subscribeToListingsRefresh(listener: () => void): () => void {
  listingRefreshListeners.add(listener);
  return () => {
    listingRefreshListeners.delete(listener);
  };
}

function notifyListingsRefresh(): void {
  listingRefreshListeners.forEach((fn) => fn());
}

export async function getActiveListings(): Promise<Listing[]> {
  await seedDemoListings();

  const merged = new Map<string, Listing>();
  const demoMap = readLocalMap(DEMO_LISTINGS_KEY);
  Object.values(demoMap).forEach((l) => {
    if (l.status === 'active') merged.set(l.id, l);
  });

  const localMap = readLocalMap(LISTINGS_KEY);
  Object.values(localMap).forEach((l) => {
    if (l.status === 'active') merged.set(l.id, l);
  });

  if (isFirebaseConfigured && db && auth?.currentUser) {
    try {
      const q = query(collection(db, 'listings'), where('status', '==', 'active'));
      const snap = await getDocs(q);
      snap.forEach((d) => {
        const normalized = normalizeListing(d.data() as Record<string, unknown>, d.id);
        merged.set(normalized.id, normalized);
      });
    } catch (error) {
      if (isPermissionDenied(error)) {
        handleFirestoreError(error, OperationType.LIST, 'listings');
      }
    }
  }

  return Array.from(merged.values()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export async function getOwnerListings(ownerId: string): Promise<Listing[]> {
  if (!ownerId) return [];

  const merged = new Map<string, Listing>();
  const localMap = readLocalMap(LISTINGS_KEY);
  Object.values(localMap).forEach((l) => {
    if (l.ownerId === ownerId) merged.set(l.id, l);
  });

  if (isFirebaseConfigured && db && auth?.currentUser && auth.currentUser.uid === ownerId) {
    try {
      const q = query(collection(db, 'listings'), where('ownerId', '==', ownerId));
      const snap = await getDocs(q);
      snap.forEach((d) => {
        const normalized = normalizeListing(d.data() as Record<string, unknown>, d.id);
        merged.set(normalized.id, normalized);
      });
    } catch (error) {
      if (isPermissionDenied(error)) {
        handleFirestoreError(error, OperationType.LIST, 'listings');
      }
    }
  }

  return Array.from(merged.values()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export async function getListingById(listingId: string): Promise<Listing | null> {
  if (!listingId) return null;
  await seedDemoListings();

  const demoMap = readLocalMap(DEMO_LISTINGS_KEY);
  if (demoMap[listingId]) return demoMap[listingId];

  const localMap = readLocalMap(LISTINGS_KEY);

  if (isFirebaseConfigured && db && auth?.currentUser) {
    const path = `listings/${listingId}`;
    try {
      const snap = await getDoc(doc(db, 'listings', listingId));
      if (snap.exists()) {
        const normalized = normalizeListing(snap.data() as Record<string, unknown>, snap.id);
        localMap[listingId] = normalized;
        writeLocalMap(LISTINGS_KEY, localMap);
        return normalized;
      }
    } catch (error) {
      if (isPermissionDenied(error)) {
        handleFirestoreError(error, OperationType.GET, path);
      }
    }
  }

  return localMap[listingId] || null;
}

export type SaveListingInput = Omit<
  Listing,
  'id' | 'ownerId' | 'ownerName' | 'isDemo' | 'createdAt' | 'updatedAt'
>;

export async function saveListing(
  ownerId: string,
  ownerName: string,
  input: SaveListingInput,
  existingListing?: Listing | null,
): Promise<Listing> {
  const isEdit = Boolean(existingListing);
  const id =
    existingListing?.id ||
    `listing_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

  const totalBeds = Math.min(50, Math.max(1, Math.round(input.totalBeds)));
  const availableBeds = Math.min(totalBeds, Math.max(0, Math.round(input.availableBeds)));
  const rentPerMonth = Math.min(200000, Math.max(500, Math.round(input.rentPerMonth)));
  const securityDeposit = Math.min(500000, Math.max(0, Math.round(input.securityDeposit)));

  const cleanPhotos = input.photoUrls
    .map((u) => u.trim())
    .filter((u) => isSafeImageUrl(u))
    .slice(0, 5);

  const sanitizedFields = {
    id,
    ownerId,
    ownerName: ownerName.trim().slice(0, 80) || 'Property Owner',
    title: input.title.trim().slice(0, 120),
    propertyType: input.propertyType,
    address: {
      street: input.address.street.trim().slice(0, 160),
      area: input.address.area.trim().slice(0, 100),
      city: input.address.city.trim().slice(0, 80),
      pincode: input.address.pincode.trim().slice(0, 12),
    },
    rentPerMonth,
    securityDeposit,
    totalBeds,
    availableBeds,
    genderAllowed: input.genderAllowed,
    furnished: input.furnished,
    amenities: input.amenities.slice(0, 10),
    houseRules: {
      smokingAllowed: Boolean(input.houseRules.smokingAllowed),
      drinkingAllowed: Boolean(input.houseRules.drinkingAllowed),
      guestsAllowed: Boolean(input.houseRules.guestsAllowed),
      curfewTime: input.houseRules.curfewTime.trim().slice(0, 40),
      vegOnly: Boolean(input.houseRules.vegOnly),
      petsAllowed: Boolean(input.houseRules.petsAllowed),
    },
    nearbyLandmark: input.nearbyLandmark.trim().slice(0, 120),
    availableFrom: input.availableFrom.trim().slice(0, 20),
    description: input.description.trim().slice(0, 500),
    photoUrls: cleanPhotos,
    authorizedConfirmed: true,
    status: input.status,
    isDemo: false,
  };

  const nowIso = new Date().toISOString();
  const savedLocal: Listing = {
    ...sanitizedFields,
    createdAt: existingListing?.createdAt || nowIso,
    updatedAt: nowIso,
  };

  if (isFirebaseConfigured && db && auth?.currentUser && auth.currentUser.uid === ownerId) {
    const path = `listings/${id}`;
    try {
      if (isEdit) {
        await updateDoc(doc(db, 'listings', id), {
          ...sanitizedFields,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(doc(db, 'listings', id), {
          ...sanitizedFields,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error('Firestore saveListing failed:', {
        path,
        payload: { ...sanitizedFields, updatedAt: 'serverTimestamp()' },
        authUid: auth.currentUser?.uid ?? null,
        error,
      });
      if (isPermissionDenied(error)) {
        handleFirestoreError(
          error,
          isEdit ? OperationType.UPDATE : OperationType.CREATE,
          path,
        );
      }
      const msg = error instanceof Error ? error.message.toLowerCase() : '';
      if (!msg.includes('offline') && !msg.includes('unavailable')) {
        throw error;
      }
    }
  }

  const localMap = readLocalMap(LISTINGS_KEY);
  localMap[id] = savedLocal;
  writeLocalMap(LISTINGS_KEY, localMap);
  if (!isEdit) {
    clearListingDraft(ownerId);
  }
  notifyListingsRefresh();

  return savedLocal;
}

export async function updateListingStatus(
  listing: Listing,
  ownerId: string,
  nextStatus: ListingStatus,
): Promise<Listing> {
  return saveListing(
    ownerId,
    listing.ownerName,
    {
      title: listing.title,
      propertyType: listing.propertyType,
      address: listing.address,
      rentPerMonth: listing.rentPerMonth,
      securityDeposit: listing.securityDeposit,
      totalBeds: listing.totalBeds,
      availableBeds: listing.availableBeds,
      genderAllowed: listing.genderAllowed,
      furnished: listing.furnished,
      amenities: listing.amenities,
      houseRules: listing.houseRules,
      nearbyLandmark: listing.nearbyLandmark,
      availableFrom: listing.availableFrom,
      description: listing.description,
      photoUrls: listing.photoUrls,
      authorizedConfirmed: listing.authorizedConfirmed || true,
      status: nextStatus,
    },
    listing,
  );
}

export async function deleteListing(listingId: string, ownerId: string): Promise<void> {
  const localMap = readLocalMap(LISTINGS_KEY);
  delete localMap[listingId];
  writeLocalMap(LISTINGS_KEY, localMap);

  if (isFirebaseConfigured && db && auth?.currentUser && auth.currentUser.uid === ownerId) {
    const path = `listings/${listingId}`;
    try {
      await deleteDoc(doc(db, 'listings', listingId));
    } catch (error) {
      if (isPermissionDenied(error)) {
        handleFirestoreError(error, OperationType.DELETE, path);
      }
      const msg = error instanceof Error ? error.message.toLowerCase() : '';
      if (!msg.includes('offline') && !msg.includes('unavailable')) {
        throw error;
      }
    }
  }

  notifyListingsRefresh();
}
