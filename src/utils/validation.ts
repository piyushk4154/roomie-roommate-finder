import type { LoginInput, SignUpInput } from '../services/types';

export type SignUpErrors = Partial<Record<keyof SignUpInput, string>>;
export type LoginErrors = Partial<Record<keyof LoginInput, string>>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateName(name: string): string | undefined {
  const trimmed = name.trim();
  if (!trimmed) {
    return 'Please enter your full name.';
  }
  if (trimmed.length < 2) {
    return 'Name must be at least 2 characters long.';
  }
  if (trimmed.length > 80) {
    return 'Name must be 80 characters or fewer.';
  }
  return undefined;
}

export function validateEmail(email: string): string | undefined {
  const trimmed = email.trim();
  if (!trimmed) {
    return 'Please enter your email address.';
  }
  if (!EMAIL_REGEX.test(trimmed)) {
    return 'Please enter a valid email address.';
  }
  if (trimmed.length > 120) {
    return 'Email address must be 120 characters or fewer.';
  }
  return undefined;
}

export function validatePassword(password: string): string | undefined {
  if (!password) {
    return 'Please enter a password.';
  }
  if (password.length < 6) {
    return 'Password must be at least 6 characters long.';
  }
  if (password.length > 128) {
    return 'Password must be 128 characters or fewer.';
  }
  return undefined;
}

export function validateCollege(college: string): string | undefined {
  const trimmed = college.trim();
  if (!trimmed) {
    return 'Please enter your college or university name.';
  }
  if (trimmed.length < 2) {
    return 'College name must be at least 2 characters long.';
  }
  if (trimmed.length > 120) {
    return 'College name must be 120 characters or fewer.';
  }
  return undefined;
}

export function validateCity(city: string): string | undefined {
  const trimmed = city.trim();
  if (!trimmed) {
    return 'Please enter your city.';
  }
  if (trimmed.length < 2) {
    return 'City must be at least 2 characters long.';
  }
  if (trimmed.length > 80) {
    return 'City must be 80 characters or fewer.';
  }
  return undefined;
}

export function validateSignUpForm(data: SignUpInput): SignUpErrors {
  const errors: SignUpErrors = {};

  const nameError = validateName(data.name);
  if (nameError) errors.name = nameError;

  const emailError = validateEmail(data.email);
  if (emailError) errors.email = emailError;

  const passwordError = validatePassword(data.password);
  if (passwordError) errors.password = passwordError;

  const collegeError = validateCollege(data.college);
  if (collegeError) errors.college = collegeError;

  const cityError = validateCity(data.city);
  if (cityError) errors.city = cityError;

  return errors;
}

export function validateLoginForm(data: LoginInput): LoginErrors {
  const errors: LoginErrors = {};

  const emailError = validateEmail(data.email);
  if (emailError) errors.email = emailError;

  if (!data.password) {
    errors.password = 'Please enter your password.';
  }

  return errors;
}

export function getFriendlyAuthError(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = String((error as { code: unknown }).code);
    switch (code) {
      case 'auth/email-already-in-use':
        return 'An account with this email already exists. Try logging in instead.';
      case 'auth/invalid-email':
        return 'That email address does not look valid. Please check and try again.';
      case 'auth/weak-password':
        return 'Your password is too weak. Please choose at least 6 characters.';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Incorrect email or password. Please double-check your details and try again.';
      case 'auth/too-many-requests':
        return 'Too many attempts. Please wait a few minutes and try again.';
      case 'auth/network-request-failed':
        return 'We could not reach the server. Please check your internet connection.';
      default:
        break;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Something went wrong. Please try again.';
}
