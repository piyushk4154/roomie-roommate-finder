import { Loader2, LogOut, Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';
import { subscribeToAllUserMessages } from '../services/chatService';
import { subscribeToUserRequests } from '../services/requestService';
import { getBlockedUserIdSet, subscribeToBlocks } from '../services/safetyService';
import { useUnsavedChanges } from '../services/UnsavedChangesContext';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';

export function OwnerNavbar() {
  const { user, logout } = useAuth();
  const { confirmAction } = useUnsavedChanges();
  const navigate = useNavigate();
  const location = useLocation();
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  useEffect(() => {
    if (!user?.uid) return;
    let blockedIds = new Set<string>();
    let latestRequests: Array<{ fromUserId: string; toUserId: string; status: string }> = [];
    let latestMessages: Array<{ senderId: string; readBy: string[]; participantIds: string[] }> = [];

    const recompute = () => {
      const pending = latestRequests.filter(
        (r) =>
          r.toUserId === user.uid &&
          r.status === 'pending' &&
          !blockedIds.has(r.fromUserId),
      ).length;
      setPendingCount(pending);

      const unread = latestMessages.filter((m) => {
        const otherId = m.participantIds.find((id) => id !== user.uid);
        return (
          m.senderId !== user.uid &&
          !m.readBy.includes(user.uid) &&
          (!otherId || !blockedIds.has(otherId))
        );
      }).length;
      setUnreadChatCount(unread);
    };

    const unsubBlocks = subscribeToBlocks(user.uid, (blocks) => {
      blockedIds = getBlockedUserIdSet(user.uid, blocks);
      recompute();
    });
    const unsubReqs = subscribeToUserRequests(user.uid, (reqs) => {
      latestRequests = reqs;
      recompute();
    });
    const unsubMsgs = subscribeToAllUserMessages(user.uid, (msgs) => {
      latestMessages = msgs;
      recompute();
    });

    return () => {
      unsubBlocks();
      unsubReqs();
      unsubMsgs();
    };
  }, [user?.uid]);

  const performLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } finally {
      setLoggingOut(false);
    }
  };

  const handleLogout = () => {
    if (loggingOut) return;
    confirmAction(() => {
      void performLogout();
    });
  };

  const navItems = [
    {
      label: 'My Listings',
      to: '/owner',
      activeMatch:
        location.pathname === '/owner' ||
        (location.pathname.startsWith('/owner/listings/') &&
          location.pathname !== '/owner/listings/new'),
      count: 0,
    },
    {
      label: 'Add Listing',
      to: '/owner/listings/new',
      activeMatch: location.pathname === '/owner/listings/new',
      count: 0,
    },
    {
      label: 'Requests',
      to: '/owner/requests',
      activeMatch: location.pathname === '/owner/requests',
      count: pendingCount,
    },
    {
      label: 'Chat',
      to: '/owner/chat',
      activeMatch: location.pathname.startsWith('/owner/chat'),
      count: unreadChatCount,
    },
    {
      label: 'My Profile',
      to: '/owner/profile',
      activeMatch: location.pathname === '/owner/profile',
      count: 0,
    },
  ];

  return (
    <header className="w-full border-b border-stone-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 sm:gap-8">
        <div className="flex items-center gap-2.5 shrink-0">
          <Logo to="/owner" />
          <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 text-[11px] font-semibold">
            Owner
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-5 lg:gap-6" aria-label="Owner navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={() =>
                `py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 border-b-2 inline-flex items-center gap-1.5 ${
                  item.activeMatch
                    ? 'text-indigo-700 dark:text-indigo-400 border-indigo-600 dark:border-indigo-400 font-semibold'
                    : 'text-stone-600 dark:text-slate-300 border-transparent hover:text-indigo-700 dark:hover:text-indigo-300'
                }`
              }
            >
              <span>{item.label}</span>
              {item.count > 0 && (
                <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-indigo-600 text-white text-[11px] font-bold tabular-nums">
                  {item.count}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2.5 shrink-0">
          <ThemeToggle />
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="inline-flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-800/90 text-sm font-semibold text-stone-700 dark:text-slate-200 hover:bg-stone-50 dark:hover:bg-slate-800 hover:text-indigo-700 dark:hover:text-indigo-300 hover:border-indigo-200 dark:hover:border-indigo-700 transition-colors whitespace-nowrap shrink-0 disabled:opacity-60 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
          >
            {loggingOut ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : (
              <LogOut className="w-4 h-4" aria-hidden="true" />
            )}
            <span>{loggingOut ? 'Logging out...' : 'Logout'}</span>
          </button>
        </div>

        <div className="md:hidden flex items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="inline-flex items-center justify-center w-11 h-11 rounded-xl text-stone-700 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors cursor-pointer relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            {(pendingCount > 0 || unreadChatCount > 0) && !mobileOpen && (
              <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-indigo-600" />
            )}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={() =>
                `flex items-center justify-between min-h-[44px] px-3 rounded-xl text-sm font-medium transition-colors ${
                  item.activeMatch
                    ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-semibold'
                    : 'text-stone-700 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800'
                }`
              }
            >
              <span>{item.label}</span>
              {item.count > 0 && (
                <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-indigo-600 text-white text-[11px] font-bold tabular-nums">
                  {item.count}
                </span>
              )}
            </NavLink>
          ))}
          <div className="pt-1 pb-1">
            <ThemeToggle showLabel />
          </div>
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              void handleLogout();
            }}
            disabled={loggingOut}
            className="w-full flex items-center gap-2 min-h-[44px] px-3 rounded-xl text-sm font-semibold text-stone-700 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors disabled:opacity-60 cursor-pointer"
          >
            {loggingOut ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : (
              <LogOut className="w-4 h-4" aria-hidden="true" />
            )}
            <span>{loggingOut ? 'Logging out...' : 'Logout'}</span>
          </button>
        </div>
      )}
    </header>
  );
}
