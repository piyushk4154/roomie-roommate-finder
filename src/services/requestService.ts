import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { ensureChatForAcceptedRequest } from './chatService';
import { auth, db, handleFirestoreError, isFirebaseConfigured, OperationType } from './firebase';
import { ensureDemoListingInFirestore } from './listingService';
import { getDemoOwnerPhone, getOwnerPublicProfile } from './ownerProfileService';
import { ensureDemoProfileInFirestore, getProfile } from './profileService';
import type { ConnectRequest, RequestStatus } from './types';

const REQUESTS_KEY = 'roomie_requests_v1';

const requestListeners = new Set<() => void>();
const demoAutoAcceptTimers = new Map<string, number>();

function notifyRequests(): void {
  requestListeners.forEach((fn) => fn());
}

function readLocalRequests(): ConnectRequest[] {
  try {
    const raw = window.localStorage.getItem(REQUESTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ConnectRequest[]) : [];
  } catch {
    return [];
  }
}

function writeLocalRequests(requests: ConnectRequest[]): void {
  window.localStorage.setItem(REQUESTS_KEY, JSON.stringify(requests));
}

function isPermissionDenied(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = 'code' in error ? String((error as { code: unknown }).code) : '';
  const msg = error instanceof Error ? error.message.toLowerCase() : '';
  return code === 'permission-denied' || msg.includes('missing or insufficient permissions');
}

function isOfflineError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = 'code' in error ? String((error as { code: unknown }).code) : '';
  const msg = error instanceof Error ? error.message.toLowerCase() : '';
  return (
    code === 'unavailable' ||
    msg.includes('offline') ||
    msg.includes('unavailable') ||
    msg.includes('network')
  );
}

function scheduleDemoAutoAccept(
  req: ConnectRequest,
  onDemoAccepted?: (senderName: string) => void,
): void {
  if (demoAutoAcceptTimers.has(req.id)) return;

  const timerId = window.setTimeout(async () => {
    demoAutoAcceptTimers.delete(req.id);

    const isOwnerDemo = req.toUserId.startsWith('demo_owner_');
    const demoOwnerPhone = isOwnerDemo ? getDemoOwnerPhone(req.toUserId) : undefined;

    const useFirestore =
      isFirebaseConfigured &&
      db &&
      auth?.currentUser &&
      auth.currentUser.uid === req.fromUserId;

    if (useFirestore && db) {
      const requestPath = `requests/${req.id}`;
      const acceptPayload: Record<string, unknown> = {
        status: 'accepted' as const,
        updatedAt: serverTimestamp(),
      };
      if (demoOwnerPhone) {
        acceptPayload.ownerPhone = demoOwnerPhone;
      }

      try {
        const reqRef = doc(db, 'requests', req.id);
        const snap = await getDoc(reqRef);
        if (!snap.exists() || snap.data().status !== 'pending') {
          return;
        }

        if (isOwnerDemo && req.listingId) {
          await ensureDemoListingInFirestore(req.listingId);
        } else {
          await ensureDemoProfileInFirestore(req.toUserId);
        }

        // Step 1: Accept request FIRST in Firestore
        await updateDoc(reqRef, acceptPayload);

        const accepted: ConnectRequest = {
          ...req,
          status: 'accepted',
          ownerPhone: demoOwnerPhone,
          updatedAt: new Date().toISOString(),
        };

        let targetName = 'Hey';
        let welcomeText = '';
        if (isOwnerDemo) {
          const demoOwner = await getOwnerPublicProfile(req.toUserId);
          targetName = demoOwner?.name || 'Property Owner';
          const listingLabel = req.listingTitle ? `"${req.listingTitle}"` : 'this listing';
          welcomeText = `Hi! Thanks for your enquiry about ${listingLabel}. It is currently available—let me know when you'd like to schedule an in-person visit!`;
        } else {
          const demoProfile = await getProfile(req.toUserId);
          targetName = demoProfile?.basics.name || 'Hey';
          const city = demoProfile?.housing.preferredCity || 'campus';
          welcomeText = `Hi! Thanks for reaching out—I'd love to chat about finding a place in ${city}. When are you planning to move in?`;
        }

        // Step 2 & 3: Create chat document SECOND, then create welcome message THIRD
        await ensureChatForAcceptedRequest(accepted, {
          senderId: req.toUserId,
          text: welcomeText,
        });

        onDemoAccepted?.(targetName);
        return;
      } catch (error) {
        console.error('Firestore demo auto-accept failed:', {
          path: requestPath,
          payload: { ...acceptPayload, updatedAt: 'serverTimestamp()' },
          authUid: auth?.currentUser?.uid ?? null,
          emailVerified: auth?.currentUser?.emailVerified ?? null,
          error,
        });
        if (isPermissionDenied(error)) {
          handleFirestoreError(error, OperationType.UPDATE, requestPath);
        }
        if (!isOfflineError(error)) {
          return;
        }
      }
    }

    const current = readLocalRequests().find((r) => r.id === req.id);
    if (!current || current.status !== 'pending') return;

    const nowIso = new Date().toISOString();
    const accepted: ConnectRequest = {
      ...current,
      status: 'accepted',
      ownerPhone: demoOwnerPhone,
      updatedAt: nowIso,
    };

    const nextList = readLocalRequests().map((r) => (r.id === req.id ? accepted : r));
    writeLocalRequests(nextList);
    notifyRequests();

    let targetName = 'Hey';
    let welcomeText = '';
    if (isOwnerDemo) {
      const demoOwner = await getOwnerPublicProfile(req.toUserId);
      targetName = demoOwner?.name || 'Property Owner';
      const listingLabel = req.listingTitle ? `"${req.listingTitle}"` : 'this listing';
      welcomeText = `Hi! Thanks for your enquiry about ${listingLabel}. It is currently available—let me know when you'd like to schedule an in-person visit!`;
    } else {
      const demoProfile = await getProfile(req.toUserId);
      targetName = demoProfile?.basics.name || 'Hey';
      const city = demoProfile?.housing.preferredCity || 'campus';
      welcomeText = `Hi! Thanks for reaching out—I'd love to chat about finding a place in ${city}. When are you planning to move in?`;
    }

    await ensureChatForAcceptedRequest(accepted, {
      senderId: req.toUserId,
      text: welcomeText,
    });

    onDemoAccepted?.(targetName);
  }, 5000);

  demoAutoAcceptTimers.set(req.id, timerId);
}

export interface SendConnectRequestOptions {
  listingId?: string;
  listingTitle?: string;
  onDemoAccepted?: (demoName: string) => void;
}

export async function sendConnectRequest(
  fromUserId: string,
  toUserId: string,
  message: string,
  onDemoAcceptedOrOptions?: ((demoName: string) => void) | SendConnectRequestOptions,
): Promise<ConnectRequest> {
  if (fromUserId === toUserId) {
    throw new Error('You cannot send a connect request to yourself.');
  }

  const opts: SendConnectRequestOptions =
    typeof onDemoAcceptedOrOptions === 'function'
      ? { onDemoAccepted: onDemoAcceptedOrOptions }
      : onDemoAcceptedOrOptions || {};

  const listingId = opts.listingId?.trim() || undefined;
  const listingTitle = opts.listingTitle?.trim().slice(0, 140) || undefined;
  const onDemoAccepted = opts.onDemoAccepted;

  const requestId = listingId
    ? `${fromUserId}__${toUserId}__${listingId}`
    : `${fromUserId}__${toUserId}`;
  const reverseId = listingId
    ? `${toUserId}__${fromUserId}__${listingId}`
    : `${toUserId}__${fromUserId}`;

  const localExisting = readLocalRequests().find((r) => {
    const sameScope = listingId
      ? r.listingId === listingId &&
        ((r.fromUserId === fromUserId && r.toUserId === toUserId) ||
          (r.fromUserId === toUserId && r.toUserId === fromUserId))
      : !r.listingId &&
        ((r.fromUserId === fromUserId && r.toUserId === toUserId) ||
          (r.fromUserId === toUserId && r.toUserId === fromUserId));
    return sameScope && (r.status === 'pending' || r.status === 'accepted');
  });

  if (localExisting) {
    throw new Error(
      listingId
        ? 'You already have an active enquiry for this listing.'
        : 'A request or connection already exists between you two.',
    );
  }

  const cleanMessage = message.trim().slice(0, 300);
  const nowIso = new Date().toISOString();

  const req: ConnectRequest = {
    id: requestId,
    fromUserId,
    toUserId,
    status: 'pending',
    message: cleanMessage,
    ...(listingId ? { listingId } : {}),
    ...(listingTitle ? { listingTitle } : {}),
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const isDemoTarget = toUserId.startsWith('demo_');

  if (
    isFirebaseConfigured &&
    db &&
    auth?.currentUser &&
    auth.currentUser.uid === fromUserId
  ) {
    const path = `requests/${requestId}`;
    let operation: 'setDoc' | 'updateDoc' = 'setDoc';
    let logPayload: Record<string, unknown> = {
      id: requestId,
      fromUserId,
      toUserId,
      status: 'pending',
      message: cleanMessage,
      ...(listingId ? { listingId } : {}),
      ...(listingTitle ? { listingTitle } : {}),
      createdAt: 'serverTimestamp()',
      updatedAt: 'serverTimestamp()',
    };

    try {
      if (isDemoTarget) {
        if (listingId) {
          await ensureDemoListingInFirestore(listingId);
        } else {
          await ensureDemoProfileInFirestore(toUserId);
        }
      }

      const [existingSnap, reverseSnap] = await Promise.all([
        getDoc(doc(db, 'requests', requestId)),
        getDoc(doc(db, 'requests', reverseId)),
      ]);

      if (reverseSnap.exists()) {
        const revStatus = reverseSnap.data().status;
        if (revStatus === 'pending' || revStatus === 'accepted') {
          throw new Error('A request or connection already exists between you two.');
        }
      }

      if (existingSnap.exists()) {
        const curStatus = existingSnap.data().status;
        if (curStatus === 'pending' || curStatus === 'accepted') {
          throw new Error(
            listingId
              ? 'You already have an active enquiry for this listing.'
              : 'A request or connection already exists between you two.',
          );
        }
        if (curStatus === 'declined') {
          throw new Error('This request was previously declined.');
        }
        if (curStatus === 'cancelled') {
          operation = 'updateDoc';
          logPayload = {
            status: 'pending',
            message: cleanMessage,
            createdAt: 'serverTimestamp()',
            updatedAt: 'serverTimestamp()',
          };
          await updateDoc(doc(db, 'requests', requestId), {
            status: 'pending',
            message: cleanMessage,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      } else {
        operation = 'setDoc';
        await setDoc(doc(db, 'requests', requestId), {
          id: requestId,
          fromUserId,
          toUserId,
          status: 'pending',
          message: cleanMessage,
          ...(listingId ? { listingId } : {}),
          ...(listingTitle ? { listingTitle } : {}),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      if (isDemoTarget) {
        scheduleDemoAutoAccept(req, onDemoAccepted);
      }

      return req;
    } catch (error) {
      console.error('Firestore connect request write failed:', {
        operation,
        path,
        payload: logPayload,
        authUid: auth.currentUser?.uid ?? null,
        emailVerified: auth.currentUser?.emailVerified ?? null,
        errorCode:
          error && typeof error === 'object' && 'code' in error
            ? (error as { code: unknown }).code
            : undefined,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      if (isPermissionDenied(error)) {
        handleFirestoreError(
          error,
          operation === 'updateDoc' ? OperationType.UPDATE : OperationType.CREATE,
          path,
        );
      }
      if (!isOfflineError(error)) {
        throw error;
      }
    }
  }

  const currentList = readLocalRequests().filter((r) => r.id !== requestId);
  writeLocalRequests([...currentList, req]);
  notifyRequests();

  if (isDemoTarget) {
    scheduleDemoAutoAccept(req, onDemoAccepted);
  }

  return req;
}

export async function updateRequestStatus(
  request: ConnectRequest,
  actorUserId: string,
  nextStatus: Extract<RequestStatus, 'accepted' | 'declined' | 'cancelled'>,
  ownerPhone?: string,
): Promise<ConnectRequest> {
  const pendingTimer = demoAutoAcceptTimers.get(request.id);
  if (pendingTimer !== undefined) {
    window.clearTimeout(pendingTimer);
    demoAutoAcceptTimers.delete(request.id);
  }

  const cleanPhone =
    nextStatus === 'accepted' && ownerPhone?.trim()
      ? ownerPhone.trim().slice(0, 25)
      : undefined;

  const updated: ConnectRequest = {
    ...request,
    status: nextStatus,
    ...(cleanPhone ? { ownerPhone: cleanPhone } : {}),
    updatedAt: new Date().toISOString(),
  };

  if (
    isFirebaseConfigured &&
    db &&
    auth?.currentUser &&
    auth.currentUser.uid === actorUserId
  ) {
    const path = `requests/${request.id}`;
    const updatePayload: Record<string, unknown> = {
      status: nextStatus,
      updatedAt: serverTimestamp(),
    };
    if (cleanPhone) {
      updatePayload.ownerPhone = cleanPhone;
    }
    try {
      await updateDoc(doc(db, 'requests', request.id), updatePayload);
      if (nextStatus === 'accepted') {
        await ensureChatForAcceptedRequest(updated);
      }
      return updated;
    } catch (error) {
      console.error('Firestore updateRequestStatus failed:', {
        path,
        payload: { ...updatePayload, updatedAt: 'serverTimestamp()' },
        actorUserId,
        authUid: auth.currentUser?.uid ?? null,
        emailVerified: auth.currentUser?.emailVerified ?? null,
        error,
      });
      if (isPermissionDenied(error)) {
        handleFirestoreError(error, OperationType.UPDATE, path);
      }
      if (!isOfflineError(error)) {
        throw error;
      }
    }
  }

  const list = readLocalRequests();
  const nextList = list.map((r) => (r.id === request.id ? updated : r));
  writeLocalRequests(nextList);
  notifyRequests();

  if (nextStatus === 'accepted') {
    await ensureChatForAcceptedRequest(updated);
  }

  return updated;
}

export function subscribeToUserRequests(
  userId: string,
  onChange: (requests: ConnectRequest[]) => void,
): () => void {
  let sentRemote: ConnectRequest[] = [];
  let receivedRemote: ConnectRequest[] = [];

  const emitMerged = () => {
    const local = readLocalRequests().filter(
      (r) => r.fromUserId === userId || r.toUserId === userId,
    );
    const map = new Map<string, ConnectRequest>();
    local.forEach((r) => map.set(r.id, r));
    sentRemote.forEach((r) => map.set(r.id, r));
    receivedRemote.forEach((r) => map.set(r.id, r));

    const sorted = Array.from(map.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
    onChange(sorted);
  };

  requestListeners.add(emitMerged);
  emitMerged();

  let unsubSent: (() => void) | undefined;
  let unsubReceived: (() => void) | undefined;

  if (isFirebaseConfigured && db && auth?.currentUser && auth.currentUser.uid === userId) {
    const mapSnap = (data: Record<string, unknown>, id: string): ConnectRequest => ({
      id: String(data.id || id),
      fromUserId: String(data.fromUserId),
      toUserId: String(data.toUserId),
      status: data.status as RequestStatus,
      message: String(data.message || ''),
      ...(data.listingId ? { listingId: String(data.listingId) } : {}),
      ...(data.listingTitle ? { listingTitle: String(data.listingTitle) } : {}),
      ...(data.ownerPhone ? { ownerPhone: String(data.ownerPhone) } : {}),
      createdAt:
        data.createdAt && typeof (data.createdAt as { toDate?: () => Date }).toDate === 'function'
          ? (data.createdAt as { toDate: () => Date }).toDate().toISOString()
          : String(data.createdAt || new Date().toISOString()),
      updatedAt:
        data.updatedAt && typeof (data.updatedAt as { toDate?: () => Date }).toDate === 'function'
          ? (data.updatedAt as { toDate: () => Date }).toDate().toISOString()
          : String(data.updatedAt || new Date().toISOString()),
    });

    const qSent = query(collection(db, 'requests'), where('fromUserId', '==', userId));
    unsubSent = onSnapshot(
      qSent,
      (snap) => {
        sentRemote = snap.docs.map((d) => mapSnap(d.data(), d.id));
        emitMerged();
      },
      (error) => {
        if (isPermissionDenied(error)) {
          handleFirestoreError(error, OperationType.LIST, 'requests');
        }
      },
    );

    const qRec = query(collection(db, 'requests'), where('toUserId', '==', userId));
    unsubReceived = onSnapshot(
      qRec,
      (snap) => {
        receivedRemote = snap.docs.map((d) => mapSnap(d.data(), d.id));
        emitMerged();
      },
      (error) => {
        if (isPermissionDenied(error)) {
          handleFirestoreError(error, OperationType.LIST, 'requests');
        }
      },
    );
  }

  return () => {
    requestListeners.delete(emitMerged);
    unsubSent?.();
    unsubReceived?.();
  };
}
