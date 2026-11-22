import { AlertTriangle } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface UnsavedGuardConfig {
  isDirty: boolean;
  onDiscard: () => void;
}

interface UnsavedChangesContextValue {
  setGuard: (config: UnsavedGuardConfig | null) => void;
  confirmAction: (action: () => void) => void;
}

const UnsavedChangesContext = createContext<UnsavedChangesContextValue | undefined>(undefined);

export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const guardRef = useRef<UnsavedGuardConfig | null>(null);
  const bypassRef = useRef(false);

  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const setGuard = useCallback((config: UnsavedGuardConfig | null) => {
    guardRef.current = config;
  }, []);

  const confirmAction = useCallback((action: () => void) => {
    if (guardRef.current?.isDirty && !bypassRef.current) {
      setPendingAction(() => action);
      return;
    }
    action();
  }, []);

  // Warn on tab close / refresh when dirty
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (guardRef.current?.isDirty && !bypassRef.current) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Intercept internal <a>/<Link> clicks when dirty
  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (!guardRef.current?.isDirty || bypassRef.current) return;
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest('a[href]') as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target && anchor.target !== '_self') return;

      const url = new URL(anchor.href, window.location.origin);
      if (url.origin !== window.location.origin) return;

      const targetPath = `${url.pathname}${url.search}${url.hash}`;
      const currentPath = `${location.pathname}${location.search}${location.hash}`;
      if (targetPath === currentPath) return;

      event.preventDefault();
      event.stopPropagation();
      setPendingAction(() => () => navigate(targetPath));
    };

    document.addEventListener('click', handleDocumentClick, true);
    return () => document.removeEventListener('click', handleDocumentClick, true);
  }, [location.hash, location.pathname, location.search, navigate]);

  const handleStay = () => {
    setPendingAction(null);
  };

  const handleDiscardAndContinue = () => {
    const action = pendingAction;
    setPendingAction(null);
    bypassRef.current = true;
    try {
      guardRef.current?.onDiscard();
      action?.();
    } finally {
      window.setTimeout(() => {
        bypassRef.current = false;
      }, 0);
    }
  };

  return (
    <UnsavedChangesContext.Provider value={{ setGuard, confirmAction }}>
      {children}

      {pendingAction && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/45 dark:bg-black/70 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="unsaved-nav-title"
        >
          <div className="bg-white dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-start gap-3 mb-4">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 shrink-0">
                <AlertTriangle className="w-5 h-5" aria-hidden="true" />
              </span>
              <div>
                <h2
                  id="unsaved-nav-title"
                  className="font-display text-lg font-bold text-indigo-950 dark:text-slate-100"
                >
                  Discard unsaved changes?
                </h2>
                <p className="text-sm text-stone-600 dark:text-slate-300 mt-1 leading-relaxed">
                  You have unsaved edits. If you leave now, those changes will be lost.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleStay}
                className="px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold text-stone-700 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Keep editing
              </button>
              <button
                type="button"
                onClick={handleDiscardAndContinue}
                className="px-5 py-2.5 min-h-[44px] rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 cursor-pointer"
              >
                Discard & leave
              </button>
            </div>
          </div>
        </div>
      )}
    </UnsavedChangesContext.Provider>
  );
}

export function useUnsavedChanges(): UnsavedChangesContextValue {
  const ctx = useContext(UnsavedChangesContext);
  if (!ctx) {
    return {
      setGuard: () => {},
      confirmAction: (action) => action(),
    };
  }
  return ctx;
}
