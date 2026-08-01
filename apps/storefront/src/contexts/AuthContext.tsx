import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Customer } from '../types/domain';
import { getMe, loginCustomer, registerCustomer } from '../lib/api';
import { customerTokenStorage } from '../lib/storage';

type AuthContextValue = {
  user: Customer | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function extractToken(payload: Record<string, unknown>): string {
  const token = payload.token ?? payload.accessToken ?? (payload.data && typeof payload.data === 'object' ? (payload.data as Record<string, unknown>).token : undefined);
  if (typeof token !== 'string') throw new Error('The API did not return a customer token.');
  return token;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(Boolean(customerTokenStorage.get()));

  const loadMe = useCallback(async () => {
    if (!customerTokenStorage.get()) { setLoading(false); return; }
    try { setUser(await getMe()); } catch { customerTokenStorage.clear(); setUser(null); } finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadMe(); }, [loadMe]);
  useEffect(() => {
    const expire = () => { customerTokenStorage.clear(); setUser(null); };
    window.addEventListener('customer-session-expired', expire);
    return () => window.removeEventListener('customer-session-expired', expire);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    login: async (email, password) => {
      const result = await loginCustomer({ email, password }) as unknown as Record<string, unknown>;
      customerTokenStorage.set(extractToken(result));
      setUser(result.user as Customer | undefined ?? await getMe());
    },
    register: async (name, email, password) => {
      const result = await registerCustomer({ name, email, password }) as unknown as Record<string, unknown>;
      customerTokenStorage.set(extractToken(result));
      setUser(result.user as Customer | undefined ?? await getMe());
    },
    logout: () => { customerTokenStorage.clear(); setUser(null); },
  }), [loading, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
