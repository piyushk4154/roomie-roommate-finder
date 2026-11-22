import type { AccountRole, LoginInput, SignUpInput, StudentUser } from './types';

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

function normalizeUserRole(role: unknown): AccountRole {
  return role === 'owner' ? 'owner' : 'student';
}

function toPublicUser(record: StoredUserRecord): StudentUser {
  const { passwordHash: _ignored, ...user } = record;
  return {
    ...user,
    role: normalizeUserRole(user.role),
    college: user.college || '',
    phone: user.phone || '',
  };
}

export function getLocalSessionUser(): StudentUser | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StudentUser;
    return {
      ...parsed,
      role: normalizeUserRole(parsed.role),
      college: parsed.college || '',
      phone: parsed.phone || '',
    };
  } catch {
    return null;
  }
}

export function setLocalSessionUser(user: StudentUser | null): void {
  if (user) {
    window.localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        ...user,
        role: normalizeUserRole(user.role),
      }),
    );
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
  const role = normalizeUserRole(input.role);

  const record: StoredUserRecord = {
    uid,
    name: input.name.trim(),
    email,
    role,
    college: role === 'student' ? (input.college || '').trim() : '',
    phone: role === 'owner' ? (input.phone || '').trim() : '',
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

export async function localUpdateUser(
  uid: string,
  updates: Partial<Pick<StudentUser, 'name' | 'city' | 'phone' | 'college'>>,
): Promise<StudentUser | null> {
  const users = readStoredUsers();
  const now = new Date().toISOString();
  let updatedRecord: StoredUserRecord | null = null;

  const nextUsers = users.map((u) => {
    if (u.uid !== uid) return u;
    updatedRecord = {
      ...u,
      ...updates,
      updatedAt: now,
    };
    return updatedRecord;
  });

  if (updatedRecord) {
    writeStoredUsers(nextUsers);
    const pub = toPublicUser(updatedRecord);
    setLocalSessionUser(pub);
    return pub;
  }

  const session = getLocalSessionUser();
  if (session && session.uid === uid) {
    const nextSession: StudentUser = {
      ...session,
      ...updates,
      updatedAt: now,
    };
    setLocalSessionUser(nextSession);
    return nextSession;
  }

  return null;
}

export async function localResetPassword(email: string): Promise<void> {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) {
    throw new Error('Please enter your email address.');
  }
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
