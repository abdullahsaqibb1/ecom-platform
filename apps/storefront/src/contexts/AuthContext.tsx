import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Customer } from '../types/domain';
import { getMe, loginCustomer, logoutCustomer, registerCustomer } from '../lib/api';
import { customerSecurityStorage } from '../lib/storage';

type AuthContextValue = {
  user: Customer | null;
  loading: boolean;
  login: (email: string, password: string, turnstileToken?: string) => Promise<void>;
  register: (name: string, email: string, password: string, turnstileToken?: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    try {
      const result = await getMe();
      setUser(result.user);
      if (result.csrfToken) customerSecurityStorage.setCsrf(result.csrfToken);
    } catch {
      customerSecurityStorage.clear();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadMe(); }, [loadMe]);
  useEffect(() => {
    const expire = () => { customerSecurityStorage.clear(); setUser(null); };
    window.addEventListener('customer-session-expired', expire);
    return () => window.removeEventListener('customer-session-expired', expire);
  }, []);

  const logout = useCallback(async () => {
    try { await logoutCustomer(); } catch { /* Clear local session state even if the API is unavailable. */ }
    customerSecurityStorage.clear();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    login: async (email, password, turnstileToken) => {
      const result = await loginCustomer({ email, password, turnstileToken });
      if (result.csrfToken) customerSecurityStorage.setCsrf(result.csrfToken);
      setUser(result.user);
    },
    register: async (name, email, password, turnstileToken) => {
      const result = await registerCustomer({ name, email, password, turnstileToken });
      if (result.csrfToken) customerSecurityStorage.setCsrf(result.csrfToken);
      setUser(result.user);
    },
    logout,
  }), [loading, logout, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
