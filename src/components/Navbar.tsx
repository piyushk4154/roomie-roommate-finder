import { Link } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';

export function Navbar() {
  const { user, loading } = useAuth();
  const dashboardPath = user?.role === 'owner' ? '/owner' : '/dashboard';

  return (
    <header className="w-full border-b border-stone-200/80 dark:border-slate-800 bg-[#f8f7f4]/95 dark:bg-slate-950/95">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 sm:gap-8">
        <Logo to="/" />

        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-stone-600 dark:text-slate-300" aria-label="Main navigation">
          <a
            href="#how-it-works"
            className="hover:text-indigo-700 dark:hover:text-indigo-400 transition-colors whitespace-nowrap shrink-0 py-2"
          >
            How it works
          </a>
          <a
            href="#built-for-students"
            className="hover:text-indigo-700 dark:hover:text-indigo-400 transition-colors whitespace-nowrap shrink-0 py-2"
          >
            For students
          </a>
          <a
            href="#for-owners"
            className="hover:text-indigo-700 dark:hover:text-indigo-400 transition-colors whitespace-nowrap shrink-0 py-2"
          >
            For owners
          </a>
        </nav>

        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <ThemeToggle />
          {!loading && user ? (
            <Link
              to={dashboardPath}
              className="inline-flex items-center justify-center px-4 py-2.5 min-h-[40px] rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors whitespace-nowrap shrink-0 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="inline-flex items-center justify-center px-3.5 py-2.5 min-h-[40px] rounded-xl text-sm font-semibold text-stone-700 dark:text-slate-200 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-stone-200/60 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
              >
                Log in
              </Link>
              <Link
                to="/signup"
                className="inline-flex items-center justify-center px-4 py-2.5 min-h-[40px] rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors whitespace-nowrap shrink-0 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
