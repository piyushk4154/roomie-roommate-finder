import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  loginWithEmail,
  logoutUser,
  sendForgotPassword,
  signUpWithEmail,
  subscribeToAuthChanges,
} from './authService';
import type { LoginInput, SignUpInput, StudentUser } from './types';

interface AuthContextValue {
  user: StudentUser | null;
  loading: boolean;
  signUp: (input: SignUpInput) => Promise<StudentUser>;
  login: (input: LoginInput) => Promise<StudentUser>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StudentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signUp = async (input: SignUpInput): Promise<StudentUser> => {
    const created = await signUpWithEmail(input);
    setUser(created);
    return created;
  };

  const login = async (input: LoginInput): Promise<StudentUser> => {
    const loggedIn = await loginWithEmail(input);
    setUser(loggedIn);
    return loggedIn;
  };

  const logout = async (): Promise<void> => {
    await logoutUser();
    setUser(null);
  };

  const resetPassword = async (email: string): Promise<void> => {
    await sendForgotPassword(email);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, login, logout, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside an AuthProvider.');
  }
  return ctx;
}
