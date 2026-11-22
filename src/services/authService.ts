import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { getFriendlyAuthError } from '../utils/validation';
import { auth, db, handleFirestoreError, isFirebaseConfigured, OperationType } from './firebase';
import {
  getLocalSessionUser,
  localLogin,
  localLogout,
  localResetPassword,
  localSignUp,
  localUpdateUser,
  setLocalSessionUser,
  subscribeLocalAuth,
} from './localStorageFallback';
import { ensureOwnerPublicProfileOnSignUp } from './ownerProfileService';
import type { AccountRole, LoginInput, SignUpInput, StudentUser } from './types';

const FIREBASE_UNAVAILABLE_CODES = new Set([
  'auth/operation-not-allowed',
  'auth/configuration-not-found',
  'auth/admin-restricted-operation',
  'auth/network-request-failed',
]);

// Cache newly created profile briefly to avoid a read-before-write race when onAuthStateChanged fires
const pendingProfiles = new Map<string, StudentUser>();

function isFirebaseUnavailableError(error: unknown): boolean {
  if (!error || typeof error !== 'object' || !('code' in error)) {
    return false;
  }
  return FIREBASE_UNAVAILABLE_CODES.has(String((error as { code: unknown }).code));
}

function isPermissionDeniedError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = 'code' in error ? String((error as { code: unknown }).code) : '';
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  return code === 'permission-denied' || message.includes('missing or insufficient permissions');
}

function normalizeRole(role: unknown): AccountRole {
  return role === 'owner' ? 'owner' : 'student';
}

async function fetchUserProfile(firebaseUser: User): Promise<StudentUser> {
  const cached = pendingProfiles.get(firebaseUser.uid);
  if (cached) {
    return cached;
  }

  if (!db) {
    return {
      uid: firebaseUser.uid,
      name: firebaseUser.displayName || 'User',
      email: firebaseUser.email || '',
      role: 'student',
      college: '',
      phone: '',
      city: '',
    };
  }

  const userPath = `users/${firebaseUser.uid}`;
  try {
    const snapshot = await getDoc(doc(db, 'users', firebaseUser.uid));
    if (snapshot.exists()) {
      const data = snapshot.data();
      return {
        uid: String(data.uid || firebaseUser.uid),
        name: String(data.name || firebaseUser.displayName || 'User'),
        email: String(data.email || firebaseUser.email || ''),
        role: normalizeRole(data.role),
        college: String(data.college || ''),
        phone: String(data.phone || ''),
        city: String(data.city || ''),
      };
    }
  } catch (error) {
    if (isPermissionDeniedError(error)) {
      handleFirestoreError(error, OperationType.GET, userPath);
    }
    const localMatch = getLocalSessionUser();
    if (localMatch && localMatch.uid === firebaseUser.uid) {
      return localMatch;
    }
  }

  return {
    uid: firebaseUser.uid,
    name: firebaseUser.displayName || 'User',
    email: firebaseUser.email || '',
    role: 'student',
    college: '',
    phone: '',
    city: '',
  };
}

export async function signUpWithEmail(input: SignUpInput): Promise<StudentUser> {
  const role = normalizeRole(input.role);
  const cleanInput: SignUpInput = {
    role,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    password: input.password,
    college: role === 'student' ? (input.college || '').trim() : '',
    phone: role === 'owner' ? (input.phone || '').trim() : '',
    city: input.city.trim(),
  };

  if (!isFirebaseConfigured || !auth || !db) {
    const localUser = await localSignUp(cleanInput);
    if (localUser.role === 'owner') {
      await ensureOwnerPublicProfileOnSignUp(localUser);
    }
    return localUser;
  }

  try {
    const credential = await createUserWithEmailAndPassword(
      auth,
      cleanInput.email,
      cleanInput.password,
    );

    const userProfile: StudentUser = {
      uid: credential.user.uid,
      name: cleanInput.name,
      email: cleanInput.email,
      role,
      college: cleanInput.college || '',
      phone: cleanInput.phone || '',
      city: cleanInput.city,
    };

    pendingProfiles.set(credential.user.uid, userProfile);

    await updateProfile(credential.user, {
      displayName: cleanInput.name,
    });

    const userPath = `users/${credential.user.uid}`;
    try {
      await setDoc(doc(db, 'users', credential.user.uid), {
        uid: credential.user.uid,
        name: cleanInput.name,
        email: cleanInput.email,
        role,
        college: cleanInput.college || '',
        phone: cleanInput.phone || '',
        city: cleanInput.city,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (firestoreError) {
      if (isPermissionDeniedError(firestoreError)) {
        handleFirestoreError(firestoreError, OperationType.WRITE, userPath);
      }
      const msg = firestoreError instanceof Error ? firestoreError.message.toLowerCase() : '';
      if (!msg.includes('offline') && !msg.includes('unavailable')) {
        throw firestoreError;
      }
    }

    if (role === 'owner') {
      await ensureOwnerPublicProfileOnSignUp(userProfile);
    }

    setLocalSessionUser(userProfile);
    return userProfile;
  } catch (error) {
    if (isFirebaseUnavailableError(error)) {
      const localUser = await localSignUp(cleanInput);
      if (localUser.role === 'owner') {
        await ensureOwnerPublicProfileOnSignUp(localUser);
      }
      return localUser;
    }
    throw new Error(getFriendlyAuthError(error));
  }
}

export async function loginWithEmail(input: LoginInput): Promise<StudentUser> {
  const cleanEmail = input.email.trim().toLowerCase();

  if (!isFirebaseConfigured || !auth) {
    return localLogin({ email: cleanEmail, password: input.password });
  }

  try {
    const credential = await signInWithEmailAndPassword(auth, cleanEmail, input.password);
    const profile = await fetchUserProfile(credential.user);
    setLocalSessionUser(profile);
    return profile;
  } catch (error) {
    if (isFirebaseUnavailableError(error)) {
      return localLogin({ email: cleanEmail, password: input.password });
    }
    throw new Error(getFriendlyAuthError(error));
  }
}

export async function updateUserAccount(
  currentUser: StudentUser,
  updates: { name: string; city: string; phone?: string; college?: string },
): Promise<StudentUser> {
  const cleanUpdates = {
    name: updates.name.trim().slice(0, 80),
    city: updates.city.trim().slice(0, 80),
    phone: (updates.phone ?? currentUser.phone ?? '').trim().slice(0, 25),
    college: (updates.college ?? currentUser.college ?? '').trim().slice(0, 120),
  };

  const nextUser: StudentUser = {
    ...currentUser,
    ...cleanUpdates,
    updatedAt: new Date().toISOString(),
  };

  pendingProfiles.set(currentUser.uid, nextUser);

  if (isFirebaseConfigured && db && auth?.currentUser && auth.currentUser.uid === currentUser.uid) {
    const userPath = `users/${currentUser.uid}`;
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        name: cleanUpdates.name,
        city: cleanUpdates.city,
        phone: cleanUpdates.phone,
        college: cleanUpdates.college,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      if (isPermissionDeniedError(error)) {
        handleFirestoreError(error, OperationType.UPDATE, userPath);
      }
      const msg = error instanceof Error ? error.message.toLowerCase() : '';
      if (!msg.includes('offline') && !msg.includes('unavailable')) {
        throw error;
      }
    }
  }

  await localUpdateUser(currentUser.uid, cleanUpdates);
  setLocalSessionUser(nextUser);
  return nextUser;
}

export async function sendForgotPassword(email: string): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();

  if (!isFirebaseConfigured || !auth) {
    await localResetPassword(cleanEmail);
    return;
  }

  try {
    await sendPasswordResetEmail(auth, cleanEmail);
  } catch (error) {
    if (isFirebaseUnavailableError(error)) {
      await localResetPassword(cleanEmail);
      return;
    }
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      String((error as { code: unknown }).code) === 'auth/user-not-found'
    ) {
      return;
    }
    throw new Error(getFriendlyAuthError(error));
  }
}

export async function logoutUser(): Promise<void> {
  pendingProfiles.clear();
  if (isFirebaseConfigured && auth) {
    try {
      await signOut(auth);
    } catch {
      // Proceed to clear local fallback session even if network signOut fails
    }
  }
  await localLogout();
}

export function subscribeToAuthChanges(callback: (user: StudentUser | null) => void): () => void {
  if (!isFirebaseConfigured || !auth) {
    return subscribeLocalAuth(callback);
  }

  let firebaseInitialized = false;

  const unsubscribeLocal = subscribeLocalAuth((localUser) => {
    if (!auth?.currentUser && firebaseInitialized) {
      callback(localUser);
    }
  });

  const unsubscribeFirebase = onAuthStateChanged(auth, async (firebaseUser) => {
    firebaseInitialized = true;
    if (firebaseUser) {
      try {
        const profile = await fetchUserProfile(firebaseUser);
        setLocalSessionUser(profile);
        callback(profile);
      } catch {
        const fallbackProfile: StudentUser = {
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || 'User',
          email: firebaseUser.email || '',
          role: 'student',
          college: '',
          phone: '',
          city: '',
        };
        callback(fallbackProfile);
      }
      return;
    }

    callback(getLocalSessionUser());
  });

  return () => {
    unsubscribeFirebase();
    unsubscribeLocal();
  };
}
