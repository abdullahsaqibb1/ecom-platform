import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { apiRequest, ADMIN_API, unwrapEntity } from '../../lib/api';
import { adminSecurityStorage } from '../../lib/storage';
import type { Admin } from '../../types/domain';

interface LoginPayload {
  email: string;
  password: string;
  turnstileToken?: string;
}

interface SessionResponse {
  admin?: Admin;
  csrfToken?: string | null;
  data?: {
    admin?: Admin;
    csrfToken?: string | null;
  };
}

interface AuthContextValue {
  admin: Admin | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshAdmin: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readAdmin(payload: SessionResponse): Admin | undefined {
  return payload.admin ?? payload.data?.admin;
}

function readCsrf(payload: SessionResponse): string | null | undefined {
  return payload.csrfToken ?? payload.data?.csrfToken;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(async () => {
    try {
      await apiRequest<void>(ADMIN_API.logout, { method: 'POST' });
    } catch {
      // Always clear the local CSRF state if the server session is already gone.
    }
    adminSecurityStorage.clear();
    setAdmin(null);
  }, []);

  const refreshAdmin = useCallback(async () => {
    try {
      const payload = await apiRequest<SessionResponse>(ADMIN_API.me);
      const returnedAdmin = readAdmin(payload) ?? unwrapEntity<Admin>(payload, ['admin', 'user']);
      const csrfToken = readCsrf(payload);
      if (csrfToken) adminSecurityStorage.setCsrf(csrfToken);
      setAdmin(returnedAdmin);
    } catch {
      adminSecurityStorage.clear();
      setAdmin(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshAdmin();
  }, [refreshAdmin]);

  useEffect(() => {
    const handleExpired = () => {
      adminSecurityStorage.clear();
      setAdmin(null);
    };
    window.addEventListener('admin-session-expired', handleExpired);
    return () => window.removeEventListener('admin-session-expired', handleExpired);
  }, []);

  const login = useCallback(
    async (credentials: LoginPayload) => {
      const payload = await apiRequest<SessionResponse>(ADMIN_API.login, {
        method: 'POST',
        auth: false,
        body: credentials,
      });
      const csrfToken = readCsrf(payload);
      if (csrfToken) adminSecurityStorage.setCsrf(csrfToken);
      const returnedAdmin = readAdmin(payload);
      if (returnedAdmin) setAdmin(returnedAdmin);
      else await refreshAdmin();
    },
    [refreshAdmin],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      admin,
      isLoading,
      isAuthenticated: Boolean(admin),
      login,
      logout,
      refreshAdmin,
    }),
    [admin, isLoading, login, logout, refreshAdmin],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider.');
  return context;
}
