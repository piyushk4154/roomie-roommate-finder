import { AlertCircle, ArrowLeft, CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { useAuth } from '../services/AuthContext';
import type { LoginInput } from '../services/types';
import { validateEmail, validateLoginForm, type LoginErrors } from '../utils/validation';

export function LoginPage() {
  const { login, resetPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectTo =
    (location.state as { from?: string } | null)?.from &&
    (location.state as { from?: string }).from !== '/login'
      ? (location.state as { from: string }).from
      : '/dashboard';

  const [mode, setMode] = useState<'login' | 'forgot'>('login');

  const [form, setForm] = useState<LoginInput>({ email: '', password: '' });
  const [touched, setTouched] = useState<Partial<Record<keyof LoginInput, boolean>>>({});
  const [errors, setErrors] = useState<LoginErrors>({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [resetEmail, setResetEmail] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetSubmitting, setResetSubmitting] = useState(false);

  const handleChange = (field: keyof LoginInput, value: string) => {
    const updated = { ...form, [field]: value };
    setForm(updated);
    setServerError('');

    if (touched[field]) {
      const nextErrors = validateLoginForm(updated);
      setErrors((prev) => ({ ...prev, [field]: nextErrors[field] }));
    }
  };

  const handleBlur = (field: keyof LoginInput) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const nextErrors = validateLoginForm(form);
    setErrors((prev) => ({ ...prev, [field]: nextErrors[field] }));
  };

  const handleLoginSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setServerError('');
    setTouched({ email: true, password: true });

    const validationErrors = validateLoginForm(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setSubmitting(true);
    try {
      await login(form);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Unable to log in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const openForgotPassword = () => {
    setResetEmail(form.email);
    setResetError('');
    setResetSent(false);
    setServerError('');
    setMode('forgot');
  };

  const handleResetSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResetError('');
    setResetSent(false);

    const emailErr = validateEmail(resetEmail);
    if (emailErr) {
      setResetError(emailErr);
      return;
    }

    setResetSubmitting(true);
    try {
      await resetPassword(resetEmail);
      setResetSent(true);
    } catch (err) {
      setResetError(
        err instanceof Error ? err.message : 'Unable to send reset email. Please try again.',
      );
    } finally {
      setResetSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f7f4] flex flex-col justify-center px-4 py-10 sm:px-6">
      <div className="w-full max-w-md mx-auto">
        <div className="flex justify-center mb-7">
          <Logo to="/" />
        </div>

        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-[0_4px_24px_-6px_rgba(26,25,43,0.08)]">
          {mode === 'login' ? (
            <>
              <div className="mb-6">
                <h1 className="font-display text-2xl font-bold text-indigo-950 tracking-tight">
                  Welcome back
                </h1>
                <p className="text-sm text-stone-600 mt-1">
                  Log in to your Roomie account to continue.
                </p>
              </div>

              {serverError && (
                <div
                  role="alert"
                  className="mb-5 flex items-start gap-2.5 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-800"
                >
                  <AlertCircle
                    className="w-4 h-4 text-rose-600 shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <span>{serverError}</span>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} noValidate className="space-y-4">
                <div>
                  <label
                    htmlFor="login-email"
                    className="block text-sm font-medium text-stone-800 mb-1.5"
                  >
                    Email address
                  </label>
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="maya@university.edu"
                    value={form.email}
                    disabled={submitting}
                    onChange={(e) => handleChange('email', e.target.value)}
                    onBlur={() => handleBlur('email')}
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? 'login-email-error' : undefined}
                    className={`w-full min-h-[44px] rounded-xl border px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 disabled:bg-stone-50 ${
                      errors.email ? 'border-rose-400' : 'border-stone-300'
                    }`}
                  />
                  {errors.email && (
                    <p
                      id="login-email-error"
                      role="alert"
                      className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-rose-700"
                    >
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span>{errors.email}</span>
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="login-password"
                      className="block text-sm font-medium text-stone-800"
                    >
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={openForgotPassword}
                      className="text-xs font-semibold text-indigo-700 hover:text-indigo-800 hover:underline underline-offset-4 cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="login-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      value={form.password}
                      disabled={submitting}
                      onChange={(e) => handleChange('password', e.target.value)}
                      onBlur={() => handleBlur('password')}
                      aria-invalid={Boolean(errors.password)}
                      aria-describedby={errors.password ? 'login-password-error' : undefined}
                      className={`w-full min-h-[44px] rounded-xl border pl-3.5 pr-11 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 disabled:bg-stone-50 ${
                        errors.password ? 'border-rose-400' : 'border-stone-300'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 inline-flex items-center justify-center rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-colors cursor-pointer"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p
                      id="login-password-error"
                      role="alert"
                      className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-rose-700"
                    >
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span>{errors.password}</span>
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full mt-2 inline-flex items-center justify-center gap-2 min-h-[46px] px-5 py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-70 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                  <span>{submitting ? 'Logging in...' : 'Log in'}</span>
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-stone-600">
                New to Roomie?{' '}
                <Link
                  to="/signup"
                  className="font-semibold text-indigo-700 hover:text-indigo-800 underline-offset-4 hover:underline"
                >
                  Sign up
                </Link>
              </p>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setMode('login')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-indigo-700 mb-5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Back to log in</span>
              </button>

              <div className="mb-6">
                <h1 className="font-display text-2xl font-bold text-indigo-950 tracking-tight">
                  Reset your password
                </h1>
                <p className="text-sm text-stone-600 mt-1">
                  Enter the email address linked to your account and we will send reset instructions.
                </p>
              </div>

              {resetSent && (
                <div
                  role="status"
                  className="mb-5 flex items-start gap-2.5 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-900"
                >
                  <CheckCircle2
                    className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <span>
                    If an account exists for <strong>{resetEmail.trim()}</strong>, you will receive
                    a password reset link shortly.
                  </span>
                </div>
              )}

              {resetError && (
                <div
                  role="alert"
                  className="mb-5 flex items-start gap-2.5 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-800"
                >
                  <AlertCircle
                    className="w-4 h-4 text-rose-600 shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <span>{resetError}</span>
                </div>
              )}

              <form onSubmit={handleResetSubmit} noValidate className="space-y-4">
                <div>
                  <label
                    htmlFor="reset-email"
                    className="block text-sm font-medium text-stone-800 mb-1.5"
                  >
                    Email address
                  </label>
                  <input
                    id="reset-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="maya@university.edu"
                    value={resetEmail}
                    disabled={resetSubmitting}
                    onChange={(e) => {
                      setResetEmail(e.target.value);
                      setResetError('');
                    }}
                    className="w-full min-h-[44px] rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 disabled:bg-stone-50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={resetSubmitting}
                  className="w-full inline-flex items-center justify-center gap-2 min-h-[46px] px-5 py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-70 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
                >
                  {resetSubmitting && (
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  )}
                  <span>{resetSubmitting ? 'Sending link...' : 'Send reset link'}</span>
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
