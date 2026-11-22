import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../services/ThemeContext';

interface ThemeToggleProps {
  showLabel?: boolean;
  className?: string;
}

export function ThemeToggle({ showLabel = false, className = '' }: ThemeToggleProps) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={isDark}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-800/90 text-stone-700 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
        showLabel ? 'px-3 min-h-[44px] w-full justify-between' : 'w-10 h-10 min-h-[40px]'
      } ${className}`}
    >
      {showLabel ? (
        <>
          <span className="text-sm font-semibold">{isDark ? 'Dark mode' : 'Light mode'}</span>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-500 dark:text-slate-400">
            {isDark ? (
              <>
                <Sun className="w-4 h-4 text-amber-400" aria-hidden="true" />
                Switch to light
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-indigo-600" aria-hidden="true" />
                Switch to dark
              </>
            )}
          </span>
        </>
      ) : isDark ? (
        <Sun className="w-4 h-4 text-amber-400" aria-hidden="true" />
      ) : (
        <Moon className="w-4 h-4" aria-hidden="true" />
      )}
    </button>
  );
}
