import { AlertCircle, Building2, Eye, EyeOff, GraduationCap, Loader2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { ThemeToggle } from '../components/ThemeToggle';
import { useAuth } from '../services/AuthContext';
import type { AccountRole, SignUpInput } from '../services/types';
import { validateSignUpForm, type SignUpErrors } from '../utils/validation';

export function SignUpPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState<SignUpInput>({
    role: 'student',
    name: '',
    email: '',
    password: '',
    college: '',
    phone: '',
    city: '',
  });
  const [touched, setTouched] = useState<Partial<Record<keyof SignUpInput, boolean>>>({});
  const [errors, setErrors] = useState<SignUpErrors>({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleRoleChange = (nextRole: AccountRole) => {
    const updated: SignUpInput = { ...form, role: nextRole };
    setForm(updated);
    setServerError('');
    const nextErrors = validateSignUpForm(updated);
    setErrors((prev) => ({
      ...prev,
      college: nextRole === 'student' && touched.college ? nextErrors.college : undefined,
      phone: nextRole === 'owner' && touched.phone ? nextErrors.phone : undefined,
    }));
  };

  const handleChange = (field: keyof SignUpInput, value: string) => {
    const updated = { ...form, [field]: value };
    setForm(updated);
    setServerError('');

    if (touched[field]) {
      const nextErrors = validateSignUpForm(updated);
      setErrors((prev) => ({ ...prev, [field]: nextErrors[field] }));
    }
  };

  const handleBlur = (field: keyof SignUpInput) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const nextErrors = validateSignUpForm(form);
    setErrors((prev) => ({ ...prev, [field]: nextErrors[field] }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setServerError('');

    const allTouched: Partial<Record<keyof SignUpInput, boolean>> = {
      name: true,
      email: true,
      password: true,
      college: form.role === 'student',
      phone: form.role === 'owner',
      city: true,
    };
    setTouched(allTouched);

    const validationErrors = validateSignUpForm(form);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setSubmitting(true);
    try {
      const created = await signUp(form);
      navigate(created.role === 'owner' ? '/owner' : '/profile-setup', { replace: true });
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : 'Unable to create your account. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f7f4] dark:bg-slate-950 flex flex-col justify-center px-4 py-10 sm:px-6">
      <div className="w-full max-w-md mx-auto">
        <div className="relative flex items-center justify-center mb-7">
          <Logo to="/" />
          <div className="absolute right-0">
            <ThemeToggle />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-[0_4px_24px_-6px_rgba(26,25,43,0.08)] dark:shadow-none">
          <div className="mb-5">
            <h1 className="font-display text-2xl font-bold text-indigo-950 dark:text-slate-100 tracking-tight">
              Create your account
            </h1>
            <p className="text-sm text-stone-600 dark:text-slate-300 mt-1">
              {form.role === 'owner'
                ? 'List student-friendly rooms, PGs, and flats with verified enquiries.'
                : 'Join Roomie to connect with compatible college roommates and rooms.'}
            </p>
          </div>

          {serverError && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 px-4 py-3 text-sm text-rose-800 dark:text-rose-200"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Account Role Choice */}
            <fieldset>
              <legend className="block text-sm font-medium text-stone-800 dark:text-slate-200 mb-2">
                Account type
              </legend>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleRoleChange('student')}
                  aria-pressed={form.role === 'student'}
                  className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors cursor-pointer ${
                    form.role === 'student'
                      ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-950 dark:text-indigo-100'
                      : 'border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-stone-700 dark:text-slate-300 hover:bg-stone-50 dark:hover:bg-slate-800/70'
                  }`}
                >
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
                    <GraduationCap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                    <span>I&apos;m a student</span>
                  </span>
                  <span className="text-[11px] text-stone-500 dark:text-slate-400 leading-snug">
                    Find roommates &amp; rooms
                  </span>
                </button>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleRoleChange('owner')}
                  aria-pressed={form.role === 'owner'}
                  className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors cursor-pointer ${
                    form.role === 'owner'
                      ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-950 dark:text-indigo-100'
                      : 'border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-stone-700 dark:text-slate-300 hover:bg-stone-50 dark:hover:bg-slate-800/70'
                  }`}
                >
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
                    <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                    <span>I&apos;m a room/PG owner</span>
                  </span>
                  <span className="text-[11px] text-stone-500 dark:text-slate-400 leading-snug">
                    List rooms, PGs &amp; flats
                  </span>
                </button>
              </div>
            </fieldset>

            {/* Name */}
            <div>
              <label htmlFor="signup-name" className="block text-sm font-medium text-stone-800 dark:text-slate-200 mb-1.5">
                Full name
              </label>
              <input
                id="signup-name"
                name="name"
                type="text"
                autoComplete="name"
                placeholder={form.role === 'owner' ? 'Rajesh Kulkarni' : 'Maya Lin'}
                value={form.name}
                disabled={submitting}
                onChange={(e) => handleChange('name', e.target.value)}
                onBlur={() => handleBlur('name')}
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? 'signup-name-error' : undefined}
                className={`w-full min-h-[44px] rounded-xl border px-3.5 py-2.5 text-sm text-stone-900 dark:text-slate-100 placeholder:text-stone-400 dark:placeholder:text-slate-500 bg-white dark:bg-slate-950 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 disabled:bg-stone-50 dark:disabled:bg-slate-900 ${
                  errors.name ? 'border-rose-400 dark:border-rose-500' : 'border-stone-300 dark:border-slate-700'
                }`}
              />
              {errors.name && (
                <p
                  id="signup-name-error"
                  role="alert"
                  className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-rose-700 dark:text-rose-400"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>{errors.name}</span>
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="signup-email" className="block text-sm font-medium text-stone-800 dark:text-slate-200 mb-1.5">
                Email address
              </label>
              <input
                id="signup-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder={form.role === 'owner' ? 'owner@example.com' : 'maya@university.edu'}
                value={form.email}
                disabled={submitting}
                onChange={(e) => handleChange('email', e.target.value)}
                onBlur={() => handleBlur('email')}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? 'signup-email-error' : undefined}
                className={`w-full min-h-[44px] rounded-xl border px-3.5 py-2.5 text-sm text-stone-900 dark:text-slate-100 placeholder:text-stone-400 dark:placeholder:text-slate-500 bg-white dark:bg-slate-950 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 disabled:bg-stone-50 dark:disabled:bg-slate-900 ${
                  errors.email ? 'border-rose-400 dark:border-rose-500' : 'border-stone-300 dark:border-slate-700'
                }`}
              />
              {errors.email && (
                <p
                  id="signup-email-error"
                  role="alert"
                  className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-rose-700 dark:text-rose-400"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>{errors.email}</span>
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="signup-password"
                className="block text-sm font-medium text-stone-800 dark:text-slate-200 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="signup-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="At least 6 characters"
                  value={form.password}
                  disabled={submitting}
                  onChange={(e) => handleChange('password', e.target.value)}
                  onBlur={() => handleBlur('password')}
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? 'signup-password-error' : undefined}
                  className={`w-full min-h-[44px] rounded-xl border pl-3.5 pr-11 py-2.5 text-sm text-stone-900 dark:text-slate-100 placeholder:text-stone-400 dark:placeholder:text-slate-500 bg-white dark:bg-slate-950 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 disabled:bg-stone-50 dark:disabled:bg-slate-900 ${
                    errors.password ? 'border-rose-400 dark:border-rose-500' : 'border-stone-300 dark:border-slate-700'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 inline-flex items-center justify-center rounded-lg text-stone-500 dark:text-slate-400 hover:text-stone-800 dark:hover:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p
                  id="signup-password-error"
                  role="alert"
                  className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-rose-700 dark:text-rose-400"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>{errors.password}</span>
                </p>
              )}
            </div>

            {form.role === 'student' ? (
              <div>
                <label
                  htmlFor="signup-college"
                  className="block text-sm font-medium text-stone-800 dark:text-slate-200 mb-1.5"
                >
                  College name
                </label>
                <input
                  id="signup-college"
                  name="college"
                  type="text"
                  autoComplete="organization"
                  placeholder="IIT Indore / DAVV / COEP"
                  value={form.college || ''}
                  disabled={submitting}
                  onChange={(e) => handleChange('college', e.target.value)}
                  onBlur={() => handleBlur('college')}
                  aria-invalid={Boolean(errors.college)}
                  aria-describedby={errors.college ? 'signup-college-error' : undefined}
                  className={`w-full min-h-[44px] rounded-xl border px-3.5 py-2.5 text-sm text-stone-900 dark:text-slate-100 placeholder:text-stone-400 dark:placeholder:text-slate-500 bg-white dark:bg-slate-950 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 disabled:bg-stone-50 dark:disabled:bg-slate-900 ${
                    errors.college ? 'border-rose-400 dark:border-rose-500' : 'border-stone-300 dark:border-slate-700'
                  }`}
                />
                {errors.college && (
                  <p
                    id="signup-college-error"
                    role="alert"
                    className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-rose-700 dark:text-rose-400"
                  >
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>{errors.college}</span>
                  </p>
                )}
              </div>
            ) : (
              <div>
                <label
                  htmlFor="signup-phone"
                  className="block text-sm font-medium text-stone-800 dark:text-slate-200 mb-1.5"
                >
                  Phone number <span className="text-xs font-normal text-stone-500 dark:text-slate-400">(optional)</span>
                </label>
                <input
                  id="signup-phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+91 98765 43210"
                  value={form.phone || ''}
                  disabled={submitting}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  onBlur={() => handleBlur('phone')}
                  aria-invalid={Boolean(errors.phone)}
                  aria-describedby={errors.phone ? 'signup-phone-error' : 'signup-phone-hint'}
                  className={`w-full min-h-[44px] rounded-xl border px-3.5 py-2.5 text-sm text-stone-900 dark:text-slate-100 placeholder:text-stone-400 dark:placeholder:text-slate-500 bg-white dark:bg-slate-950 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 disabled:bg-stone-50 dark:disabled:bg-slate-900 ${
                    errors.phone ? 'border-rose-400 dark:border-rose-500' : 'border-stone-300 dark:border-slate-700'
                  }`}
                />
                <p id="signup-phone-hint" className="mt-1 text-[11px] text-stone-500 dark:text-slate-400">
                  Hidden from public listings. Only shared when you accept a student&apos;s enquiry.
                </p>
                {errors.phone && (
                  <p
                    id="signup-phone-error"
                    role="alert"
                    className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-rose-700 dark:text-rose-400"
                  >
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>{errors.phone}</span>
                  </p>
                )}
              </div>
            )}

            {/* City */}
            <div>
              <label htmlFor="signup-city" className="block text-sm font-medium text-stone-800 dark:text-slate-200 mb-1.5">
                City
              </label>
              <input
                id="signup-city"
                name="city"
                type="text"
                autoComplete="address-level2"
                placeholder="Indore"
                value={form.city}
                disabled={submitting}
                onChange={(e) => handleChange('city', e.target.value)}
                onBlur={() => handleBlur('city')}
                aria-invalid={Boolean(errors.city)}
                aria-describedby={errors.city ? 'signup-city-error' : undefined}
                className={`w-full min-h-[44px] rounded-xl border px-3.5 py-2.5 text-sm text-stone-900 dark:text-slate-100 placeholder:text-stone-400 dark:placeholder:text-slate-500 bg-white dark:bg-slate-950 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 disabled:bg-stone-50 dark:disabled:bg-slate-900 ${
                  errors.city ? 'border-rose-400 dark:border-rose-500' : 'border-stone-300 dark:border-slate-700'
                }`}
              />
              {errors.city && (
                <p
                  id="signup-city-error"
                  role="alert"
                  className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-rose-700 dark:text-rose-400"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>{errors.city}</span>
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 min-h-[46px] px-5 py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-70 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
              <span>{submitting ? 'Creating account...' : 'Create account'}</span>
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-stone-600 dark:text-slate-300">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-semibold text-indigo-700 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 underline-offset-4 hover:underline"
            >
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
