import {
  addDoc,
  arrayUnion,
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
import { auth, db, handleFirestoreError, isFirebaseConfigured, OperationType } from './firebase';
import type { ChatMessage, ChatThread, ConnectRequest } from './types';

const CHATS_KEY = 'roomie_chats_v1';
const MESSAGES_KEY = 'roomie_messages_v1';

const chatListeners = new Set<() => void>();
const messageListeners = new Set<() => void>();

function notifyChats(): void {
  chatListeners.forEach((fn) => fn());
}

function notifyMessages(): void {
  messageListeners.forEach((fn) => fn());
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

export function buildChatId(userA: string, userB: string): string {
  const sorted = [userA, userB].sort();
  return `${sorted[0]}__${sorted[1]}`;
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

export async function ensureChatForAcceptedRequest(
  request: ConnectRequest,
  initialMessage?: { senderId: string; text: string },
): Promise<ChatThread> {
  const sorted = [request.fromUserId, request.toUserId].sort() as [string, string];
  const chatId = buildChatId(sorted[0], sorted[1]);
  const nowIso = new Date().toISOString();
  const initialLastMessage = initialMessage?.text || 'You are connected! Say hello.';

  const localThread: ChatThread = {
    id: chatId,
    participantIds: sorted,
    requestId: request.id,
    lastMessage: initialLastMessage,
    updatedAt: nowIso,
  };

  if (
    isFirebaseConfigured &&
    db &&
    auth?.currentUser &&
    sorted.includes(auth.currentUser.uid)
  ) {
    const chatPath = `chats/${chatId}`;
    const chatPayload = {
      id: chatId,
      participantIds: sorted,
      requestId: request.id,
      lastMessage: initialLastMessage,
      updatedAt: serverTimestamp(),
    };

    try {
      const chatRef = doc(db, 'chats', chatId);
      const existingSnap = await getDoc(chatRef);
      const existed = existingSnap.exists();

      // Step 1: Ensure chat document exists in Firestore before any message write
      if (!existed) {
        await setDoc(chatRef, chatPayload);
      } else if (initialMessage) {
        await updateDoc(chatRef, {
          lastMessage: initialMessage.text,
          updatedAt: serverTimestamp(),
        });
      }

      // Step 2: Write optional initial message after chat document is committed
      if (initialMessage && !existed) {
        const msgPayload = {
          chatId,
          participantIds: sorted,
          senderId: initialMessage.senderId,
          text: initialMessage.text,
          timestamp: serverTimestamp(),
          readBy: [initialMessage.senderId],
        };
        try {
          await addDoc(collection(db, 'messages'), msgPayload);
        } catch (msgError) {
          console.error('Firestore initial message write failed:', {
            path: 'messages',
            payload: { ...msgPayload, timestamp: 'serverTimestamp()' },
            chatPath,
            error: msgError,
          });
          if (isPermissionDenied(msgError)) {
            handleFirestoreError(msgError, OperationType.WRITE, 'messages');
          }
          throw msgError;
        }
      }

      return localThread;
    } catch (error) {
      console.error('Firestore chat creation failed:', {
        path: chatPath,
        payload: { ...chatPayload, updatedAt: 'serverTimestamp()' },
        requestId: request.id,
        error,
      });
      if (isPermissionDenied(error)) {
        handleFirestoreError(error, OperationType.WRITE, chatPath);
      }
      if (!isOfflineError(error)) {
        throw error;
      }
      // Fall through to localStorage fallback when offline
    }
  }

  const chats = readJsonList<ChatThread>(CHATS_KEY);
  let chat = chats.find((c) => c.id === chatId);

  if (!chat) {
    chat = localThread;
    writeJsonList(CHATS_KEY, [...chats, chat]);
  } else if (initialMessage) {
    chat = {
      ...chat,
      lastMessage: initialMessage.text,
      updatedAt: nowIso,
    };
    writeJsonList(
      CHATS_KEY,
      chats.map((c) => (c.id === chatId ? chat! : c)),
    );
  }

  if (initialMessage) {
    const messages = readJsonList<ChatMessage>(MESSAGES_KEY);
    const msg: ChatMessage = {
      id: `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
      chatId,
      participantIds: sorted,
      senderId: initialMessage.senderId,
      text: initialMessage.text,
      timestamp: nowIso,
      readBy: [initialMessage.senderId],
    };
    writeJsonList(MESSAGES_KEY, [...messages, msg]);
    notifyMessages();
  }

  notifyChats();
  return chat;
}

export async function sendMessage(
  chat: ChatThread,
  senderId: string,
  text: string,
): Promise<void> {
  const cleanText = text.trim().slice(0, 1000);
  if (!cleanText) return;

  const nowIso = new Date().toISOString();

  if (
    isFirebaseConfigured &&
    db &&
    auth?.currentUser &&
    auth.currentUser.uid === senderId
  ) {
    const messagePayload = {
      chatId: chat.id,
      participantIds: chat.participantIds,
      senderId,
      text: cleanText,
      timestamp: serverTimestamp(),
      readBy: [senderId],
    };
    try {
      await addDoc(collection(db, 'messages'), messagePayload);
      await updateDoc(doc(db, 'chats', chat.id), {
        lastMessage: cleanText,
        updatedAt: serverTimestamp(),
      });
      return;
    } catch (error) {
      console.error('Firestore sendMessage failed:', {
        path: 'messages',
        chatPath: `chats/${chat.id}`,
        payload: { ...messagePayload, timestamp: 'serverTimestamp()' },
        error,
      });
      if (isPermissionDenied(error)) {
        handleFirestoreError(error, OperationType.WRITE, 'messages');
      }
      if (!isOfflineError(error)) {
        throw error;
      }
    }
  }

  const messages = readJsonList<ChatMessage>(MESSAGES_KEY);
  const newMsg: ChatMessage = {
    id: `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    chatId: chat.id,
    participantIds: chat.participantIds,
    senderId,
    text: cleanText,
    timestamp: nowIso,
    readBy: [senderId],
  };
  writeJsonList(MESSAGES_KEY, [...messages, newMsg]);

  const chats = readJsonList<ChatThread>(CHATS_KEY);
  const updatedChats = chats.map((c) =>
    c.id === chat.id ? { ...c, lastMessage: cleanText, updatedAt: nowIso } : c,
  );
  writeJsonList(CHATS_KEY, updatedChats);

  notifyMessages();
  notifyChats();
}

export async function markMessagesAsRead(
  chatId: string,
  userId: string,
  messages: ChatMessage[],
): Promise<void> {
  const unread = messages.filter((m) => m.senderId !== userId && !m.readBy.includes(userId));
  if (unread.length === 0) return;

  if (isFirebaseConfigured && db && auth?.currentUser && auth.currentUser.uid === userId) {
    const firestoreDb = db;
    // Update Firestore docs (skip any synthetic local-only IDs if present)
    const remoteUnread = unread.filter((m) => !m.id.startsWith('msg_'));
    if (remoteUnread.length > 0) {
      try {
        await Promise.all(
          remoteUnread.map((m) =>
            updateDoc(doc(firestoreDb, 'messages', m.id), {
              readBy: arrayUnion(userId),
            }),
          ),
        );
      } catch (error) {
        if (isPermissionDenied(error)) {
          handleFirestoreError(error, OperationType.UPDATE, 'messages');
        }
      }
    }
  }

  const allLocal = readJsonList<ChatMessage>(MESSAGES_KEY);
  if (allLocal.length > 0) {
    const unreadIds = new Set(unread.map((u) => u.id));
    const nextLocal = allLocal.map((m) =>
      unreadIds.has(m.id) && !m.readBy.includes(userId)
        ? { ...m, readBy: [...m.readBy, userId] }
        : m,
    );
    writeJsonList(MESSAGES_KEY, nextLocal);
    notifyMessages();
  }
}

export function subscribeToChats(
  userId: string,
  onChange: (chats: ChatThread[]) => void,
): () => void {
  let remoteChats: ChatThread[] = [];

  const emitMerged = () => {
    const localChats = readJsonList<ChatThread>(CHATS_KEY).filter((c) =>
      c.participantIds.includes(userId),
    );
    const map = new Map<string, ChatThread>();
    localChats.forEach((c) => map.set(c.id, c));
    remoteChats.forEach((c) => map.set(c.id, c));
    const sorted = Array.from(map.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
    onChange(sorted);
  };

  chatListeners.add(emitMerged);
  emitMerged();

  let unsubRemote: (() => void) | undefined;
  if (isFirebaseConfigured && db && auth?.currentUser && auth.currentUser.uid === userId) {
    const q = query(
      collection(db, 'chats'),
      where('participantIds', 'array-contains', userId),
    );
    unsubRemote = onSnapshot(
      q,
      (snap) => {
        remoteChats = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: String(data.id || d.id),
            participantIds: data.participantIds as [string, string],
            requestId: String(data.requestId),
            lastMessage: String(data.lastMessage || ''),
            updatedAt:
              data.updatedAt && typeof data.updatedAt.toDate === 'function'
                ? data.updatedAt.toDate().toISOString()
                : String(data.updatedAt || new Date().toISOString()),
          };
        });
        emitMerged();
      },
      (error) => {
        if (isPermissionDenied(error)) {
          handleFirestoreError(error, OperationType.LIST, 'chats');
        }
      },
    );
  }

  return () => {
    chatListeners.delete(emitMerged);
    unsubRemote?.();
  };
}

export function subscribeToMessages(
  chatId: string,
  userId: string,
  onChange: (messages: ChatMessage[]) => void,
): () => void {
  let remoteMsgs: ChatMessage[] = [];

  const emitMerged = () => {
    const localMsgs = readJsonList<ChatMessage>(MESSAGES_KEY).filter((m) => m.chatId === chatId);
    const map = new Map<string, ChatMessage>();
    localMsgs.forEach((m) => map.set(m.id, m));
    remoteMsgs.forEach((m) => map.set(m.id, m));
    const sorted = Array.from(map.values()).sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
    onChange(sorted);
  };

  messageListeners.add(emitMerged);
  emitMerged();

  let unsubRemote: (() => void) | undefined;
  if (
    isFirebaseConfigured &&
    db &&
    auth?.currentUser &&
    auth.currentUser.uid === userId
  ) {
    const q = query(
      collection(db, 'messages'),
      where('chatId', '==', chatId),
      where('participantIds', 'array-contains', userId),
    );
    unsubRemote = onSnapshot(
      q,
      (snap) => {
        remoteMsgs = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            chatId: String(data.chatId),
            participantIds: data.participantIds as [string, string],
            senderId: String(data.senderId),
            text: String(data.text),
            timestamp:
              data.timestamp && typeof data.timestamp.toDate === 'function'
                ? data.timestamp.toDate().toISOString()
                : String(data.timestamp || new Date().toISOString()),
            readBy: Array.isArray(data.readBy) ? (data.readBy as string[]) : [],
          };
        });
        emitMerged();
      },
      (error) => {
        if (isPermissionDenied(error)) {
          handleFirestoreError(error, OperationType.LIST, 'messages');
        }
      },
    );
  }

  return () => {
    messageListeners.delete(emitMerged);
    unsubRemote?.();
  };
}

export function subscribeToAllUserMessages(
  userId: string,
  onChange: (messages: ChatMessage[]) => void,
): () => void {
  let remoteMsgs: ChatMessage[] = [];

  const emitMerged = () => {
    const localMsgs = readJsonList<ChatMessage>(MESSAGES_KEY).filter((m) =>
      m.participantIds?.includes(userId),
    );
    const map = new Map<string, ChatMessage>();
    localMsgs.forEach((m) => map.set(m.id, m));
    remoteMsgs.forEach((m) => map.set(m.id, m));
    onChange(Array.from(map.values()));
  };

  messageListeners.add(emitMerged);
  emitMerged();

  let unsubRemote: (() => void) | undefined;
  if (isFirebaseConfigured && db && auth?.currentUser && auth.currentUser.uid === userId) {
    const q = query(
      collection(db, 'messages'),
      where('participantIds', 'array-contains', userId),
    );
    unsubRemote = onSnapshot(
      q,
      (snap) => {
        remoteMsgs = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            chatId: String(data.chatId),
            participantIds: data.participantIds as [string, string],
            senderId: String(data.senderId),
            text: String(data.text),
            timestamp:
              data.timestamp && typeof data.timestamp.toDate === 'function'
                ? data.timestamp.toDate().toISOString()
                : String(data.timestamp || new Date().toISOString()),
            readBy: Array.isArray(data.readBy) ? (data.readBy as string[]) : [],
          };
        });
        emitMerged();
      },
      (error) => {
        if (isPermissionDenied(error)) {
          handleFirestoreError(error, OperationType.LIST, 'messages');
        }
      },
    );
  }

  return () => {
    messageListeners.delete(emitMerged);
    unsubRemote?.();
  };
}
