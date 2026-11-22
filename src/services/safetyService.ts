import { deleteUser } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, isFirebaseConfigured, OperationType } from './firebase';
import { deleteLocalAndFirestoreProfile } from './profileService';
import type { ReportReason, SafetyReport, UserBlock } from './types';

const REPORTS_KEY = 'roomie_reports_v1';
const BLOCKS_KEY = 'roomie_blocks_v1';
const REQUESTS_KEY = 'roomie_requests_v1';
const CHATS_KEY = 'roomie_chats_v1';
const MESSAGES_KEY = 'roomie_messages_v1';

const blockListeners = new Set<() => void>();

function notifyBlockListeners(): void {
  blockListeners.forEach((fn) => fn());
}

function readJsonList<T>(key: string): T[] {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function writeJsonList<T>(key: string, items: T[]): void {
  window.localStorage.setItem(key, JSON.stringify(items));
}

function isPermissionDenied(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = 'code' in error ? String((error as { code: unknown }).code) : '';
  const msg = error instanceof Error ? error.message.toLowerCase() : '';
  return code === 'permission-denied' || msg.includes('missing or insufficient permissions');
}

export async function submitReport(
  byUserId: string,
  targetUserId: string,
  reason: ReportReason,
  notes: string,
): Promise<SafetyReport> {
  const cleanNotes = notes.trim().slice(0, 500);
  const reportId = `rep_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  const createdAtIso = new Date().toISOString();

  const report: SafetyReport = {
    id: reportId,
    byUserId,
    targetUserId,
    reason,
    notes: cleanNotes,
    createdAt: createdAtIso,
  };

  if (
    isFirebaseConfigured &&
    db &&
    auth?.currentUser &&
    auth.currentUser.uid === byUserId
  ) {
    const path = `reports/${reportId}`;
    try {
      await setDoc(doc(db, 'reports', reportId), {
        id: reportId,
        byUserId,
        targetUserId,
        reason,
        notes: cleanNotes,
        createdAt: serverTimestamp(),
      });
      return report;
    } catch (error) {
      if (isPermissionDenied(error)) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
      // Fall through to localStorage on offline errors
    }
  }

  const existing = readJsonList<SafetyReport>(REPORTS_KEY);
  writeJsonList(REPORTS_KEY, [...existing, report]);
  return report;
}

export async function blockUser(byUserId: string, targetUserId: string): Promise<UserBlock> {
  const blockId = `${byUserId}__${targetUserId}`;
  const block: UserBlock = {
    id: blockId,
    byUserId,
    targetUserId,
    createdAt: new Date().toISOString(),
  };

  const existing = readJsonList<UserBlock>(BLOCKS_KEY).filter((b) => b.id !== blockId);
  writeJsonList(BLOCKS_KEY, [...existing, block]);
  notifyBlockListeners();

  if (
    isFirebaseConfigured &&
    db &&
    auth?.currentUser &&
    auth.currentUser.uid === byUserId &&
    !targetUserId.startsWith('demo_')
  ) {
    const path = `blocks/${blockId}`;
    try {
      await setDoc(doc(db, 'blocks', blockId), {
        id: blockId,
        byUserId,
        targetUserId,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      if (isPermissionDenied(error)) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
    }
  }

  return block;
}

export async function unblockUser(blockId: string): Promise<void> {
  const remaining = readJsonList<UserBlock>(BLOCKS_KEY).filter((b) => b.id !== blockId);
  writeJsonList(BLOCKS_KEY, remaining);
  notifyBlockListeners();

  if (isFirebaseConfigured && db && auth?.currentUser) {
    const [, targetId] = blockId.split('__');
    if (targetId && !targetId.startsWith('demo_')) {
      const path = `blocks/${blockId}`;
      try {
        await deleteDoc(doc(db, 'blocks', blockId));
      } catch (error) {
        if (isPermissionDenied(error)) {
          handleFirestoreError(error, OperationType.DELETE, path);
        }
      }
    }
  }
}

export function subscribeToBlocks(
  userId: string,
  onChange: (blocks: UserBlock[]) => void,
): () => void {
  let byMeRemote: UserBlock[] = [];
  let againstMeRemote: UserBlock[] = [];

  const emitMerged = () => {
    const local = readJsonList<UserBlock>(BLOCKS_KEY).filter(
      (b) => b.byUserId === userId || b.targetUserId === userId,
    );
    const map = new Map<string, UserBlock>();
    local.forEach((b) => map.set(b.id, b));
    byMeRemote.forEach((b) => map.set(b.id, b));
    againstMeRemote.forEach((b) => map.set(b.id, b));
    onChange(Array.from(map.values()));
  };

  blockListeners.add(emitMerged);
  emitMerged();

  let unsubByMe: (() => void) | undefined;
  let unsubAgainstMe: (() => void) | undefined;

  if (isFirebaseConfigured && db && auth?.currentUser && auth.currentUser.uid === userId) {
    const q1 = query(collection(db, 'blocks'), where('byUserId', '==', userId));
    unsubByMe = onSnapshot(
      q1,
      (snap) => {
        byMeRemote = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: String(data.id || d.id),
            byUserId: String(data.byUserId),
            targetUserId: String(data.targetUserId),
            createdAt:
              data.createdAt && typeof data.createdAt.toDate === 'function'
                ? data.createdAt.toDate().toISOString()
                : String(data.createdAt || ''),
          };
        });
        emitMerged();
      },
      (error) => {
        if (isPermissionDenied(error)) {
          handleFirestoreError(error, OperationType.LIST, 'blocks');
        }
      },
    );

    const q2 = query(collection(db, 'blocks'), where('targetUserId', '==', userId));
    unsubAgainstMe = onSnapshot(
      q2,
      (snap) => {
        againstMeRemote = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: String(data.id || d.id),
            byUserId: String(data.byUserId),
            targetUserId: String(data.targetUserId),
            createdAt:
              data.createdAt && typeof data.createdAt.toDate === 'function'
                ? data.createdAt.toDate().toISOString()
                : String(data.createdAt || ''),
          };
        });
        emitMerged();
      },
      (error) => {
        if (isPermissionDenied(error)) {
          handleFirestoreError(error, OperationType.LIST, 'blocks');
        }
      },
    );
  }

  return () => {
    blockListeners.delete(emitMerged);
    unsubByMe?.();
    unsubAgainstMe?.();
  };
}

export function getBlockedUserIdSet(userId: string, blocks: UserBlock[]): Set<string> {
  const blocked = new Set<string>();
  blocks.forEach((b) => {
    if (b.byUserId === userId) blocked.add(b.targetUserId);
    if (b.targetUserId === userId) blocked.add(b.byUserId);
  });
  return blocked;
}

export async function deleteAccountAndData(userId: string): Promise<void> {
  // 1. Delete profile (Firestore + localStorage)
  await deleteLocalAndFirestoreProfile(userId);

  // 2. Clean localStorage requests, chats, messages, blocks, fallback users
  const reqs = readJsonList<{ fromUserId: string; toUserId: string }>(REQUESTS_KEY).filter(
    (r) => r.fromUserId !== userId && r.toUserId !== userId,
  );
  writeJsonList(REQUESTS_KEY, reqs);

  const chats = readJsonList<{ participantIds: string[] }>(CHATS_KEY).filter(
    (c) => !c.participantIds.includes(userId),
  );
  writeJsonList(CHATS_KEY, chats);

  const msgs = readJsonList<{ participantIds: string[]; senderId: string }>(MESSAGES_KEY).filter(
    (m) => m.senderId !== userId && !m.participantIds?.includes(userId),
  );
  writeJsonList(MESSAGES_KEY, msgs);

  const blocks = readJsonList<UserBlock>(BLOCKS_KEY).filter(
    (b) => b.byUserId !== userId && b.targetUserId !== userId,
  );
  writeJsonList(BLOCKS_KEY, blocks);

  try {
    const rawUsers = window.localStorage.getItem('roomie_fallback_users_v1');
    if (rawUsers) {
      const parsed = JSON.parse(rawUsers) as Array<{ uid: string }>;
      window.localStorage.setItem(
        'roomie_fallback_users_v1',
        JSON.stringify(parsed.filter((u) => u.uid !== userId)),
      );
    }
    window.localStorage.removeItem('roomie_fallback_session_v1');
  } catch {
    // Ignore storage cleanup errors
  }

  // 3. Clean Firestore records owned by user
  if (isFirebaseConfigured && db && auth?.currentUser && auth.currentUser.uid === userId) {
    try {
      const [sentSnap, recSnap, chatSnap, msgSnap, blockSnap] = await Promise.all([
        getDocs(query(collection(db, 'requests'), where('fromUserId', '==', userId))),
        getDocs(query(collection(db, 'requests'), where('toUserId', '==', userId))),
        getDocs(query(collection(db, 'chats'), where('participantIds', 'array-contains', userId))),
        getDocs(query(collection(db, 'messages'), where('senderId', '==', userId))),
        getDocs(query(collection(db, 'blocks'), where('byUserId', '==', userId))),
      ]);

      const deletions: Array<Promise<void>> = [];
      sentSnap.forEach((d) => deletions.push(deleteDoc(d.ref)));
      recSnap.forEach((d) => deletions.push(deleteDoc(d.ref)));
      chatSnap.forEach((d) => deletions.push(deleteDoc(d.ref)));
      msgSnap.forEach((d) => deletions.push(deleteDoc(d.ref)));
      blockSnap.forEach((d) => deletions.push(deleteDoc(d.ref)));
      deletions.push(deleteDoc(doc(db, 'users', userId)));
      await Promise.all(deletions);
    } catch (error) {
      if (isPermissionDenied(error)) {
        handleFirestoreError(error, OperationType.DELETE, `users/${userId}`);
      }
    }

    try {
      await deleteUser(auth.currentUser);
    } catch {
      // May require recent login; signOut will still run via caller
    }
  }

  notifyBlockListeners();
}
