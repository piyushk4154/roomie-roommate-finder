import {
  ArrowLeft,
  Ban,
  Flag,
  Loader2,
  MessageSquare,
  Send,
  ShieldAlert,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { DashboardNavbar } from '../components/DashboardNavbar';
import { Footer } from '../components/Footer';
import { BlockUserModal, ReportUserModal } from '../components/SafetyModals';
import { useAuth } from '../services/AuthContext';
import {
  markMessagesAsRead,
  sendMessage,
  subscribeToAllUserMessages,
  subscribeToChats,
  subscribeToMessages,
} from '../services/chatService';
import { getAllMatchableProfiles } from '../services/profileService';
import { getBlockedUserIdSet, subscribeToBlocks } from '../services/safetyService';
import { useToast } from '../services/ToastContext';
import type { ChatMessage, ChatThread, RoommateProfile } from '../services/types';

function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function ChatPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [chats, setChats] = useState<ChatThread[]>([]);
  const [allMessages, setAllMessages] = useState<ChatMessage[]>([]);
  const [activeMessages, setActiveMessages] = useState<ChatMessage[]>([]);
  const [profilesMap, setProfilesMap] = useState<Map<string, RoommateProfile>>(new Map());
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
    return () => {
      unsubBlocks();
      unsubChats();
      unsubAllMsgs();
    };
  }, [user?.uid]);

  useEffect(() => {
    let active = true;
    async function loadProfiles() {
      const all = await getAllMatchableProfiles();
      if (active) {
        setProfilesMap(new Map(all.map((p) => [p.userId, p])));
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

  const activeOtherId = activeChat?.participantIds.find((id) => id !== user?.uid) || '';
  const activeOtherProfile = profilesMap.get(activeOtherId);

  return (
    <div className="min-h-screen bg-[#f8f7f4] text-stone-900 flex flex-col">
      <DashboardNavbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col">
        <h1 className="font-display text-2xl font-bold text-indigo-950 tracking-tight mb-5">
          Messages
        </h1>

        {loading ? (
          <div className="bg-white rounded-2xl p-10 shadow-sm flex items-center justify-center gap-3 text-sm text-stone-600">
            <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" aria-hidden="true" />
            <span>Loading conversations...</span>
          </div>
        ) : visibleChats.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 sm:p-12 text-center shadow-[0_2px_16px_-4px_rgba(26,25,43,0.07)]">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 mb-4">
              <MessageSquare className="w-6 h-6" aria-hidden="true" />
            </div>
            <h2 className="font-display text-lg font-bold text-indigo-950 mb-1.5">
              No active chats yet
            </h2>
            <p className="text-sm text-stone-600 max-w-md mx-auto mb-6">
              Chats open automatically once a roommate connect request is accepted. Explore matches
              or check your pending requests to get started.
            </p>
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center px-5 py-2.5 min-h-[44px] rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
            >
              Find roommates
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-[0_2px_18px_-4px_rgba(26,25,43,0.08)] overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[540px] flex-1">
            {/* Left Panel: Connections List */}
            <aside
              className={`md:col-span-4 border-r border-stone-200/80 flex flex-col ${
                activeChat ? 'hidden md:flex' : 'flex'
              }`}
            >
              <div className="px-4 py-3.5 border-b border-stone-200/80">
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                  Connections ({visibleChats.length})
                </p>
              </div>
              <div className="divide-y divide-stone-100 overflow-y-auto flex-1">
                {visibleChats.map((chat) => {
                  const otherId = chat.participantIds.find((id) => id !== user?.uid) || '';
                  const other = profilesMap.get(otherId);
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
                        isSelected ? 'bg-indigo-50/70' : 'hover:bg-stone-50'
                      }`}
                    >
                      <Avatar
                        name={other?.basics.name || 'Student'}
                        avatar={other?.basics.avatar}
                        size="md"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-display text-sm font-bold text-indigo-950 truncate">
                            {other?.basics.name || 'Student'}
                          </p>
                          <span className="text-[11px] text-stone-400 tabular-nums shrink-0">
                            {formatTime(chat.updatedAt)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <p className="text-xs text-stone-600 truncate">{chat.lastMessage}</p>
                          {hasUnread && (
                            <span
                              className="w-2.5 h-2.5 rounded-full bg-indigo-600 shrink-0"
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
              {!activeChat ? (
                <div className="flex-1 flex items-center justify-center p-8 text-center text-sm text-stone-500">
                  Select a connection from the left to view your conversation.
                </div>
              ) : (
                <>
                  {/* Conversation Header */}
                  <div className="px-4 sm:px-5 py-3.5 border-b border-stone-200/80 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        type="button"
                        onClick={() => setSelectedChatId(null)}
                        className="md:hidden w-9 h-9 inline-flex items-center justify-center rounded-xl text-stone-600 hover:bg-stone-100 cursor-pointer"
                        aria-label="Back to connections"
                      >
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                      <Avatar
                        name={activeOtherProfile?.basics.name || 'Student'}
                        avatar={activeOtherProfile?.basics.avatar}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <Link
                          to={`/dashboard/profile/${activeOtherId}`}
                          className="font-display text-sm font-bold text-indigo-950 hover:text-indigo-700 truncate block"
                        >
                          {activeOtherProfile?.basics.name || 'Student'}
                        </Link>
                        {activeOtherProfile && (
                          <p className="text-xs text-stone-500 truncate">
                            {activeOtherProfile.basics.college} ·{' '}
                            {activeOtherProfile.housing.preferredCity}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setReportOpen(true)}
                        className="w-9 h-9 inline-flex items-center justify-center rounded-xl text-stone-500 hover:bg-stone-100 hover:text-stone-800 cursor-pointer"
                        title="Report user"
                        aria-label="Report user"
                      >
                        <Flag className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setBlockOpen(true)}
                        className="w-9 h-9 inline-flex items-center justify-center rounded-xl text-rose-600 hover:bg-rose-50 cursor-pointer"
                        title="Block user"
                        aria-label="Block user"
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Persistent Safety Banner */}
                  <div className="bg-amber-50/90 border-b border-amber-200/80 px-4 py-2.5 flex items-center gap-2 text-xs text-amber-950">
                    <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" aria-hidden="true" />
                    <span>Meet in public places first. Never share financial details or OTPs.</span>
                  </div>

                  {/* Messages Feed */}
                  <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 bg-[#f8f7f4]/50 max-h-[380px]">
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
                                : 'bg-white text-stone-900 shadow-xs rounded-bl-md'
                            }`}
                          >
                            {msg.text}
                          </div>
                          <span className="text-[11px] text-stone-400 mt-1 tabular-nums px-1">
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
                    className="p-3.5 sm:p-4 border-t border-stone-200/80 bg-white flex items-center gap-2.5"
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
                      className="flex-1 min-h-[44px] rounded-xl border border-stone-300 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
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

      {user?.uid && activeOtherId && (
        <>
          <ReportUserModal
            open={reportOpen}
            onClose={() => setReportOpen(false)}
            byUserId={user.uid}
            targetUserId={activeOtherId}
            targetName={activeOtherProfile?.basics.name || 'this user'}
          />
          <BlockUserModal
            open={blockOpen}
            onClose={() => setBlockOpen(false)}
            byUserId={user.uid}
            targetUserId={activeOtherId}
            targetName={activeOtherProfile?.basics.name || 'this user'}
            onBlocked={() => setSelectedChatId(null)}
          />
        </>
      )}

      <Footer />
    </div>
  );
}
