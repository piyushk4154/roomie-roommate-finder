import type { LoginInput, SignUpInput, StudentUser } from './types';

const USERS_KEY = 'roomie_fallback_users_v1';
const SESSION_KEY = 'roomie_fallback_session_v1';

interface StoredUserRecord extends StudentUser {
  passwordHash: string;
}

type AuthListener = (user: StudentUser | null) => void;
const listeners = new Set<AuthListener>();

function notifyListeners(user: StudentUser | null): void {
  listeners.forEach((listener) => listener(user));
}

async function hashPassword(password: string, email: string): Promise<string> {
  const normalized = `${email.toLowerCase().trim()}::${password}`;
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    const encoded = new TextEncoder().encode(normalized);
    const digest = await window.crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }
  return btoa(unescape(encodeURIComponent(normalized)));
}

function readStoredUsers(): StoredUserRecord[] {
  try {
    const raw = window.localStorage.getItem(USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredUserRecord[]) : [];
  } catch {
    return [];
  }
}

function writeStoredUsers(users: StoredUserRecord[]): void {
  window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function toPublicUser(record: StoredUserRecord): StudentUser {
  const { passwordHash: _ignored, ...user } = record;
  return user;
}

export function getLocalSessionUser(): StudentUser | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StudentUser;
  } catch {
    return null;
  }
}

export function setLocalSessionUser(user: StudentUser | null): void {
  if (user) {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } else {
    window.localStorage.removeItem(SESSION_KEY);
  }
  notifyListeners(user);
}

export async function localSignUp(input: SignUpInput): Promise<StudentUser> {
  const email = input.email.trim().toLowerCase();
  const users = readStoredUsers();

  if (users.some((u) => u.email.toLowerCase() === email)) {
    throw new Error('An account with this email already exists. Try logging in instead.');
  }

  const now = new Date().toISOString();
  const uid = `local_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const passwordHash = await hashPassword(input.password, email);

  const record: StoredUserRecord = {
    uid,
    name: input.name.trim(),
    email,
    college: input.college.trim(),
    city: input.city.trim(),
    createdAt: now,
    updatedAt: now,
    passwordHash,
  };

  writeStoredUsers([...users, record]);
  const publicUser = toPublicUser(record);
  setLocalSessionUser(publicUser);
  return publicUser;
}

export async function localLogin(input: LoginInput): Promise<StudentUser> {
  const email = input.email.trim().toLowerCase();
  const users = readStoredUsers();
  const matched = users.find((u) => u.email.toLowerCase() === email);

  if (!matched) {
    throw new Error('Incorrect email or password. Please double-check your details and try again.');
  }

  const passwordHash = await hashPassword(input.password, email);
  if (matched.passwordHash !== passwordHash) {
    throw new Error('Incorrect email or password. Please double-check your details and try again.');
  }

  const publicUser = toPublicUser(matched);
  setLocalSessionUser(publicUser);
  return publicUser;
}

export async function localResetPassword(email: string): Promise<void> {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) {
    throw new Error('Please enter your email address.');
  }
  // Never reveal whether an email exists in local fallback either; simply resolve cleanly.
}

export async function localLogout(): Promise<void> {
  setLocalSessionUser(null);
}

export function subscribeLocalAuth(listener: AuthListener): () => void {
  listeners.add(listener);
  listener(getLocalSessionUser());
  return () => {
    listeners.delete(listener);
  };
}
