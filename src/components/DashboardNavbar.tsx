import { Loader2, LogOut, Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';
import { subscribeToAllUserMessages } from '../services/chatService';
import { subscribeToUserRequests } from '../services/requestService';
import { getBlockedUserIdSet, subscribeToBlocks } from '../services/safetyService';
import { Logo } from './Logo';

export function DashboardNavbar() {
  const { user, logout } = useAuth();
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

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } finally {
      setLoggingOut(false);
    }
  };

  const navItems = [
    {
      label: 'Matches',
      to: '/dashboard',
      activeMatch:
        location.pathname === '/dashboard' ||
        location.pathname === '/dashboard/matches' ||
        (location.pathname.startsWith('/dashboard/profile/') &&
          location.pathname !== '/dashboard/profile'),
      count: 0,
    },
    {
      label: 'Requests',
      to: '/dashboard/requests',
      activeMatch: location.pathname === '/dashboard/requests',
      count: pendingCount,
    },
    {
      label: 'Chat',
      to: '/dashboard/chat',
      activeMatch: location.pathname.startsWith('/dashboard/chat'),
      count: unreadChatCount,
    },
    {
      label: 'My Profile',
      to: '/dashboard/profile',
      activeMatch: location.pathname === '/dashboard/profile',
      count: 0,
    },
  ];

  return (
    <header className="w-full border-b border-stone-200/90 bg-white sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 sm:gap-8">
        <Logo to="/dashboard" />

        <nav className="hidden md:flex items-center gap-6" aria-label="Dashboard navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={() =>
                `py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 border-b-2 inline-flex items-center gap-1.5 ${
                  item.activeMatch
                    ? 'text-indigo-700 border-indigo-600 font-semibold'
                    : 'text-stone-600 border-transparent hover:text-indigo-700'
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

        <div className="hidden md:flex items-center shrink-0">
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="inline-flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-xl border border-stone-200 bg-white text-sm font-semibold text-stone-700 hover:bg-stone-50 hover:text-indigo-700 hover:border-indigo-200 transition-colors whitespace-nowrap shrink-0 disabled:opacity-60 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
          >
            {loggingOut ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : (
              <LogOut className="w-4 h-4" aria-hidden="true" />
            )}
            <span>{loggingOut ? 'Logging out...' : 'Logout'}</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-xl text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          {(pendingCount > 0 || unreadChatCount > 0) && !mobileOpen && (
            <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-indigo-600" />
          )}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-stone-200 bg-white px-4 py-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={() =>
                `flex items-center justify-between min-h-[44px] px-3 rounded-xl text-sm font-medium transition-colors ${
                  item.activeMatch
                    ? 'bg-indigo-50 text-indigo-700 font-semibold'
                    : 'text-stone-700 hover:bg-stone-100'
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
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              void handleLogout();
            }}
            disabled={loggingOut}
            className="w-full flex items-center gap-2 min-h-[44px] px-3 rounded-xl text-sm font-semibold text-stone-700 hover:bg-stone-100 hover:text-indigo-700 transition-colors disabled:opacity-60 cursor-pointer"
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
