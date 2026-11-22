import { AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { useAuth } from '../services/AuthContext';
import type { SignUpInput } from '../services/types';
import { validateSignUpForm, type SignUpErrors } from '../utils/validation';

export function SignUpPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState<SignUpInput>({
    name: '',
    email: '',
    password: '',
    college: '',
    city: '',
  });
  const [touched, setTouched] = useState<Partial<Record<keyof SignUpInput, boolean>>>({});
  const [errors, setErrors] = useState<SignUpErrors>({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
      college: true,
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
      await signUp(form);
      navigate('/profile-setup', { replace: true });
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : 'Unable to create your account. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f7f4] flex flex-col justify-center px-4 py-10 sm:px-6">
      <div className="w-full max-w-md mx-auto">
        <div className="flex justify-center mb-7">
          <Logo to="/" />
        </div>

        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-[0_4px_24px_-6px_rgba(26,25,43,0.08)]">
          <div className="mb-6">
            <h1 className="font-display text-2xl font-bold text-indigo-950 tracking-tight">
              Create your account
            </h1>
            <p className="text-sm text-stone-600 mt-1">
              Join Roomie to connect with compatible college roommates.
            </p>
          </div>

          {serverError && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-2.5 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-800"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Name */}
            <div>
              <label htmlFor="signup-name" className="block text-sm font-medium text-stone-800 mb-1.5">
                Full name
              </label>
              <input
                id="signup-name"
                name="name"
                type="text"
                autoComplete="name"
                placeholder="Maya Lin"
                value={form.name}
                disabled={submitting}
                onChange={(e) => handleChange('name', e.target.value)}
                onBlur={() => handleBlur('name')}
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? 'signup-name-error' : undefined}
                className={`w-full min-h-[44px] rounded-xl border px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 disabled:bg-stone-50 ${
                  errors.name ? 'border-rose-400' : 'border-stone-300'
                }`}
              />
              {errors.name && (
                <p
                  id="signup-name-error"
                  role="alert"
                  className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-rose-700"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>{errors.name}</span>
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="signup-email" className="block text-sm font-medium text-stone-800 mb-1.5">
                Email address
              </label>
              <input
                id="signup-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="maya@university.edu"
                value={form.email}
                disabled={submitting}
                onChange={(e) => handleChange('email', e.target.value)}
                onBlur={() => handleBlur('email')}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? 'signup-email-error' : undefined}
                className={`w-full min-h-[44px] rounded-xl border px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 disabled:bg-stone-50 ${
                  errors.email ? 'border-rose-400' : 'border-stone-300'
                }`}
              />
              {errors.email && (
                <p
                  id="signup-email-error"
                  role="alert"
                  className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-rose-700"
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
                className="block text-sm font-medium text-stone-800 mb-1.5"
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
                  id="signup-password-error"
                  role="alert"
                  className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-rose-700"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>{errors.password}</span>
                </p>
              )}
            </div>

            {/* College Name */}
            <div>
              <label
                htmlFor="signup-college"
                className="block text-sm font-medium text-stone-800 mb-1.5"
              >
                College name
              </label>
              <input
                id="signup-college"
                name="college"
                type="text"
                autoComplete="organization"
                placeholder="University of Washington"
                value={form.college}
                disabled={submitting}
                onChange={(e) => handleChange('college', e.target.value)}
                onBlur={() => handleBlur('college')}
                aria-invalid={Boolean(errors.college)}
                aria-describedby={errors.college ? 'signup-college-error' : undefined}
                className={`w-full min-h-[44px] rounded-xl border px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 disabled:bg-stone-50 ${
                  errors.college ? 'border-rose-400' : 'border-stone-300'
                }`}
              />
              {errors.college && (
                <p
                  id="signup-college-error"
                  role="alert"
                  className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-rose-700"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>{errors.college}</span>
                </p>
              )}
            </div>

            {/* City */}
            <div>
              <label htmlFor="signup-city" className="block text-sm font-medium text-stone-800 mb-1.5">
                City
              </label>
              <input
                id="signup-city"
                name="city"
                type="text"
                autoComplete="address-level2"
                placeholder="Seattle"
                value={form.city}
                disabled={submitting}
                onChange={(e) => handleChange('city', e.target.value)}
                onBlur={() => handleBlur('city')}
                aria-invalid={Boolean(errors.city)}
                aria-describedby={errors.city ? 'signup-city-error' : undefined}
                className={`w-full min-h-[44px] rounded-xl border px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 disabled:bg-stone-50 ${
                  errors.city ? 'border-rose-400' : 'border-stone-300'
                }`}
              />
              {errors.city && (
                <p
                  id="signup-city-error"
                  role="alert"
                  className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-rose-700"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>{errors.city}</span>
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 min-h-[46px] px-5 py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-70 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
              <span>{submitting ? 'Creating account...' : 'Create account'}</span>
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-stone-600">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-semibold text-indigo-700 hover:text-indigo-800 underline-offset-4 hover:underline"
            >
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
