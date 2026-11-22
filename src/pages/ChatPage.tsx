import {
  ArrowLeft,
  Ban,
  Building2,
  Flag,
  Loader2,
  MessageSquare,
  Phone,
  Send,
  ShieldAlert,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { DashboardNavbar } from '../components/DashboardNavbar';
import { Footer } from '../components/Footer';
import { OwnerNavbar } from '../components/OwnerNavbar';
import { BlockUserModal, ReportUserModal } from '../components/SafetyModals';
import { useAuth } from '../services/AuthContext';
import {
  markMessagesAsRead,
  sendMessage,
  subscribeToAllUserMessages,
  subscribeToChats,
  subscribeToMessages,
} from '../services/chatService';
import { getAllOwnerPublicProfiles } from '../services/ownerProfileService';
import { getAllMatchableProfiles } from '../services/profileService';
import { subscribeToUserRequests } from '../services/requestService';
import { getBlockedUserIdSet, subscribeToBlocks } from '../services/safetyService';
import { useToast } from '../services/ToastContext';
import type {
  ChatMessage,
  ChatThread,
  ConnectRequest,
  OwnerPublicProfile,
  RoommateProfile,
} from '../services/types';

function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

interface ChatPageProps {
  portal?: 'student' | 'owner';
}

export function ChatPage({ portal }: ChatPageProps) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const resolvedPortal: 'student' | 'owner' =
    portal || (user?.role === 'owner' ? 'owner' : 'student');

  const [chats, setChats] = useState<ChatThread[]>([]);
  const [requests, setRequests] = useState<ConnectRequest[]>([]);
  const [allMessages, setAllMessages] = useState<ChatMessage[]>([]);
  const [activeMessages, setActiveMessages] = useState<ChatMessage[]>([]);
  const [profilesMap, setProfilesMap] = useState<Map<string, RoommateProfile>>(new Map());
  const [ownersMap, setOwnersMap] = useState<Map<string, OwnerPublicProfile>>(new Map());
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [draftText, setDraftText] = useState('');
  const [sending, setSending] = useState(false);

  const [reportOpen, setReportOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!user?.uid) return;
    const unsubBlocks = subscribeToBlocks(user.uid, (blocks) => {
      setBlockedIds(getBlockedUserIdSet(user.uid, blocks));
    });
    const unsubChats = subscribeToChats(user.uid, (nextChats) => {
      setChats(nextChats);
      setLoading(false);
    });
    const unsubAllMsgs = subscribeToAllUserMessages(user.uid, (msgs) => {
      setAllMessages(msgs);
    });
    const unsubReqs = subscribeToUserRequests(user.uid, (reqs) => {
      setRequests(reqs);
    });
    return () => {
      unsubBlocks();
      unsubChats();
      unsubAllMsgs();
      unsubReqs();
    };
  }, [user?.uid]);

  useEffect(() => {
    let active = true;
    async function loadProfiles() {
      const [allStudents, allOwners] = await Promise.all([
        getAllMatchableProfiles(),
        getAllOwnerPublicProfiles(),
      ]);
      if (active) {
        setProfilesMap(new Map(allStudents.map((p) => [p.userId, p])));
        setOwnersMap(new Map(allOwners.map((o) => [o.userId, o])));
      }
    }
    void loadProfiles();
    return () => {
      active = false;
    };
  }, []);

  const visibleChats = useMemo(() => {
    if (!user?.uid) return [];
    return chats.filter((chat) => {
      const otherId = chat.participantIds.find((id) => id !== user.uid);
      return otherId ? !blockedIds.has(otherId) : false;
    });
  }, [chats, user?.uid, blockedIds]);

  const activeChat = useMemo(
    () => visibleChats.find((c) => c.id === selectedChatId) || null,
    [visibleChats, selectedChatId],
  );

  // Auto-select first chat on desktop when none selected
  useEffect(() => {
    if (!selectedChatId && visibleChats.length > 0 && window.innerWidth >= 768) {
      setSelectedChatId(visibleChats[0].id);
    }
  }, [visibleChats, selectedChatId]);

  useEffect(() => {
    if (!user?.uid || !activeChat) {
      setActiveMessages([]);
      return;
    }
    return subscribeToMessages(activeChat.id, user.uid, (msgs) => {
      setActiveMessages(msgs);
      void markMessagesAsRead(activeChat.id, user.uid, msgs);
    });
  }, [activeChat, user?.uid]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages.length]);

  const handleSend = async (event: FormEvent) => {
    event.preventDefault();
    if (!user?.uid || !activeChat || !draftText.trim() || sending) return;
    setSending(true);
    const toSend = draftText;
    setDraftText('');
    try {
      await sendMessage(activeChat, user.uid, toSend);
    } catch (err) {
      setDraftText(toSend);
      showToast(err instanceof Error ? err.message : 'Unable to send message.', 'error');
    } finally {
      setSending(false);
    }
  };

  const resolveOtherParticipant = (chat: ChatThread) => {
    const otherId = chat.participantIds.find((id) => id !== user?.uid) || '';
    const student = profilesMap.get(otherId);
    const owner = ownersMap.get(otherId);
    const isOwner = Boolean(chat.listingId && owner && resolvedPortal === 'student') || (!student && Boolean(owner));
    return {
      otherId,
      isOwner,
      name: isOwner ? owner?.name || 'Property Owner' : student?.basics.name || owner?.name || 'User',
      avatar: isOwner ? owner?.avatar : student?.basics.avatar || owner?.avatar,
      subtitle: isOwner
        ? `Property Owner · ${owner?.city || ''}`.trim()
        : student
          ? `${student.basics.college} · ${student.housing.preferredCity}`
          : '',
    };
  };

  const activeParticipant = activeChat ? resolveOtherParticipant(activeChat) : null;
  const activeRequest = activeChat
    ? requests.find((r) => r.id === activeChat.requestId)
    : undefined;

  return (
    <div className="min-h-screen bg-[#f8f7f4] dark:bg-slate-950 text-stone-900 dark:text-slate-100 flex flex-col">
      {resolvedPortal === 'owner' ? <OwnerNavbar /> : <DashboardNavbar />}

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col">
        <h1 className="font-display text-2xl font-bold text-indigo-950 dark:text-slate-100 tracking-tight mb-5">
          Messages
        </h1>

        {loading ? (
          <div className="bg-white dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-2xl p-10 shadow-sm dark:shadow-none flex items-center justify-center gap-3 text-sm text-stone-600 dark:text-slate-300">
            <Loader2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-spin" aria-hidden="true" />
            <span>Loading conversations...</span>
          </div>
        ) : visibleChats.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-2xl p-8 sm:p-12 text-center shadow-[0_2px_16px_-4px_rgba(26,25,43,0.07)] dark:shadow-none">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 mb-4">
              <MessageSquare className="w-6 h-6" aria-hidden="true" />
            </div>
            <h2 className="font-display text-lg font-bold text-indigo-950 dark:text-slate-100 mb-1.5">
              No active chats yet
            </h2>
            <p className="text-sm text-stone-600 dark:text-slate-300 max-w-md mx-auto mb-6">
              {resolvedPortal === 'owner'
                ? 'Chats open automatically once you accept a student enquiry on one of your listings.'
                : 'Chats open automatically once a roommate request or property enquiry is accepted.'}
            </p>
            <Link
              to={resolvedPortal === 'owner' ? '/owner' : '/dashboard'}
              className="inline-flex items-center justify-center px-5 py-2.5 min-h-[44px] rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
            >
              {resolvedPortal === 'owner' ? 'View my listings' : 'Find roommates'}
            </Link>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-2xl shadow-[0_2px_18px_-4px_rgba(26,25,43,0.08)] dark:shadow-none overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[540px] flex-1">
            {/* Left Panel: Connections List */}
            <aside
              className={`md:col-span-4 border-r border-stone-200/80 dark:border-slate-800 flex flex-col ${
                activeChat ? 'hidden md:flex' : 'flex'
              }`}
            >
              <div className="px-4 py-3.5 border-b border-stone-200/80 dark:border-slate-800">
                <p className="text-xs font-semibold text-stone-500 dark:text-slate-400 uppercase tracking-wider">
                  Conversations ({visibleChats.length})
                </p>
              </div>
              <div className="divide-y divide-stone-100 dark:divide-slate-800 overflow-y-auto flex-1">
                {visibleChats.map((chat) => {
                  const other = resolveOtherParticipant(chat);
                  const isSelected = chat.id === activeChat?.id;
                  const hasUnread = allMessages.some(
                    (m) =>
                      m.chatId === chat.id &&
                      m.senderId !== user?.uid &&
                      user?.uid &&
                      !m.readBy.includes(user.uid),
                  );

                  return (
                    <button
                      key={chat.id}
                      type="button"
                      onClick={() => setSelectedChatId(chat.id)}
                      className={`w-full text-left px-4 py-3.5 min-h-[68px] flex items-center gap-3 transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-50/70 dark:bg-indigo-950/60'
                          : 'hover:bg-stone-50 dark:hover:bg-slate-800/70'
                      }`}
                    >
                      <Avatar name={other.name} avatar={other.avatar} size="md" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-display text-sm font-bold text-indigo-950 dark:text-slate-100 truncate">
                            {other.name}
                          </p>
                          <span className="text-[11px] text-stone-400 dark:text-slate-500 tabular-nums shrink-0">
                            {formatTime(chat.updatedAt)}
                          </span>
                        </div>
                        {chat.listingTitle && (
                          <p className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-400 truncate">
                            {chat.listingTitle}
                          </p>
                        )}
                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <p className="text-xs text-stone-600 dark:text-slate-300 truncate">{chat.lastMessage}</p>
                          {hasUnread && (
                            <span
                              className="w-2.5 h-2.5 rounded-full bg-indigo-600 dark:bg-indigo-400 shrink-0"
                              aria-label="Unread messages"
                            />
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>

            {/* Right Panel: Conversation */}
            <section
              className={`md:col-span-8 flex flex-col h-full ${
                activeChat ? 'flex' : 'hidden md:flex'
              }`}
            >
              {!activeChat || !activeParticipant ? (
                <div className="flex-1 flex items-center justify-center p-8 text-center text-sm text-stone-500 dark:text-slate-400">
                  Select a conversation from the left to view messages.
                </div>
              ) : (
                <>
                  {/* Conversation Header */}
                  <div className="px-4 sm:px-5 py-3.5 border-b border-stone-200/80 dark:border-slate-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        type="button"
                        onClick={() => setSelectedChatId(null)}
                        className="md:hidden w-9 h-9 inline-flex items-center justify-center rounded-xl text-stone-600 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800 cursor-pointer"
                        aria-label="Back to conversations"
                      >
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                      <Avatar
                        name={activeParticipant.name}
                        avatar={activeParticipant.avatar}
                        size="sm"
                      />
                      <div className="min-w-0">
                        {resolvedPortal === 'student' && !activeParticipant.isOwner ? (
                          <Link
                            to={`/dashboard/profile/${activeParticipant.otherId}`}
                            className="font-display text-sm font-bold text-indigo-950 dark:text-slate-100 hover:text-indigo-700 dark:hover:text-indigo-400 truncate block"
                          >
                            {activeParticipant.name}
                          </Link>
                        ) : (
                          <p className="font-display text-sm font-bold text-indigo-950 dark:text-slate-100 truncate">
                            {activeParticipant.name}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-stone-500 dark:text-slate-400">
                          {activeParticipant.subtitle && (
                            <span className="truncate">{activeParticipant.subtitle}</span>
                          )}
                          {activeChat.listingId && (
                            <Link
                              to={
                                resolvedPortal === 'owner'
                                  ? `/owner/listings/${activeChat.listingId}/edit`
                                  : `/dashboard/rooms/${activeChat.listingId}`
                              }
                              className="inline-flex items-center gap-1 text-indigo-700 dark:text-indigo-400 font-semibold hover:underline"
                            >
                              <Building2 className="w-3 h-3" aria-hidden="true" />
                              <span className="truncate max-w-[180px]">
                                {activeChat.listingTitle || 'View listing'}
                              </span>
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {resolvedPortal === 'student' && activeRequest?.ownerPhone && (
                        <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                          <Phone className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>{activeRequest.ownerPhone}</span>
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setReportOpen(true)}
                        className="w-9 h-9 inline-flex items-center justify-center rounded-xl text-stone-500 dark:text-slate-400 hover:bg-stone-100 dark:hover:bg-slate-800 hover:text-stone-800 dark:hover:text-slate-200 cursor-pointer"
                        title="Report user"
                        aria-label="Report user"
                      >
                        <Flag className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setBlockOpen(true)}
                        className="w-9 h-9 inline-flex items-center justify-center rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 cursor-pointer"
                        title="Block user"
                        aria-label="Block user"
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Persistent Safety Banner */}
                  <div className="bg-amber-50/90 dark:bg-amber-950/50 border-b border-amber-200/80 dark:border-amber-900/70 px-4 py-2.5 flex items-center gap-2 text-xs text-amber-950 dark:text-amber-200">
                    <ShieldAlert className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" aria-hidden="true" />
                    <span>
                      {activeChat.listingId
                        ? 'Visit the property in person before paying any deposit or advance.'
                        : 'Meet in public places first. Never share financial details or OTPs.'}
                    </span>
                  </div>

                  {/* Messages Feed */}
                  <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 bg-[#f8f7f4]/50 dark:bg-slate-950/60 max-h-[380px]">
                    {activeMessages.map((msg) => {
                      const isOwn = msg.senderId === user?.uid;
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}
                        >
                          <div
                            className={`max-w-[80%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                              isOwn
                                ? 'bg-indigo-600 text-white rounded-br-md'
                                : 'bg-white dark:bg-slate-800 text-stone-900 dark:text-slate-100 shadow-xs rounded-bl-md'
                            }`}
                          >
                            {msg.text}
                          </div>
                          <span className="text-[11px] text-stone-400 dark:text-slate-500 mt-1 tabular-nums px-1">
                            {formatTime(msg.timestamp)}
                          </span>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input Form */}
                  <form
                    onSubmit={handleSend}
                    className="p-3.5 sm:p-4 border-t border-stone-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2.5"
                  >
                    <label htmlFor="chat-input" className="sr-only">
                      Write a message
                    </label>
                    <input
                      id="chat-input"
                      type="text"
                      maxLength={1000}
                      value={draftText}
                      onChange={(e) => setDraftText(e.target.value)}
                      placeholder="Write a message..."
                      className="flex-1 min-h-[44px] rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-stone-900 dark:text-slate-100 placeholder:text-stone-400 dark:placeholder:text-slate-500 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                    />
                    <button
                      type="submit"
                      disabled={!draftText.trim() || sending}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <Send className="w-4 h-4" aria-hidden="true" />
                      <span className="hidden sm:inline">Send</span>
                    </button>
                  </form>
                </>
              )}
            </section>
          </div>
        )}
      </main>

      {user?.uid && activeParticipant && (
        <>
          <ReportUserModal
            open={reportOpen}
            onClose={() => setReportOpen(false)}
            byUserId={user.uid}
            targetUserId={activeParticipant.otherId}
            targetName={activeParticipant.name}
            targetType={activeParticipant.isOwner ? 'owner' : 'user'}
          />
          <BlockUserModal
            open={blockOpen}
            onClose={() => setBlockOpen(false)}
            byUserId={user.uid}
            targetUserId={activeParticipant.otherId}
            targetName={activeParticipant.name}
            isOwnerTarget={activeParticipant.isOwner}
            onBlocked={() => setSelectedChatId(null)}
          />
        </>
      )}

      <Footer />
    </div>
  );
}
