import { ArrowLeft, Compass } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DashboardNavbar } from '../components/DashboardNavbar';
import { Footer } from '../components/Footer';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../services/AuthContext';

export function NotFoundPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#f8f7f4] dark:bg-slate-950 text-stone-900 dark:text-slate-100 flex flex-col">
      {user ? <DashboardNavbar /> : <Navbar />}

      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="bg-white dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-2xl p-8 sm:p-12 max-w-md w-full text-center shadow-[0_4px_24px_-6px_rgba(26,25,43,0.08)] dark:shadow-none">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 mb-5">
            <Compass className="w-7 h-7" aria-hidden="true" />
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-1.5">
            404 Error
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-indigo-950 dark:text-slate-100 tracking-tight mb-2.5">
            Page not found
          </h1>
          <p className="text-sm text-stone-600 dark:text-slate-300 leading-relaxed mb-7">
            Sorry, we could not find the page you were looking for. It may have been moved or the
            link might be mistyped.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to={user ? '/dashboard' : '/'}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              <span>{user ? 'Back to dashboard' : 'Back to home'}</span>
            </Link>
            {user && (
              <Link
                to="/"
                className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2.5 min-h-[44px] rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-stone-700 dark:text-slate-200 hover:bg-stone-50 dark:hover:bg-slate-700 transition-colors"
              >
                Home page
              </Link>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
