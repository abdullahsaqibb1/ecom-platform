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
import { adminTokenStorage } from '../../lib/storage';
import type { Admin } from '../../types/domain';

interface LoginPayload {
  email: string;
  password: string;
}

interface LoginResponse {
  token?: string;
  accessToken?: string;
  admin?: Admin;
  data?: {
    token?: string;
    accessToken?: string;
    admin?: Admin;
  };
}

interface AuthContextValue {
  admin: Admin | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => void;
  refreshAdmin: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readToken(payload: LoginResponse): string | undefined {
  return (
    payload.token ??
    payload.accessToken ??
    payload.data?.token ??
    payload.data?.accessToken
  );
}

function readAdmin(payload: LoginResponse): Admin | undefined {
  return payload.admin ?? payload.data?.admin;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    adminTokenStorage.clear();
    setAdmin(null);
  }, []);

  const refreshAdmin = useCallback(async () => {
    if (!adminTokenStorage.get()) {
      setAdmin(null);
      setIsLoading(false);
      return;
    }

    try {
      const payload = await apiRequest<unknown>(ADMIN_API.me);
      setAdmin(unwrapEntity<Admin>(payload, ['admin', 'user']));
    } catch {
      logout();
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    void refreshAdmin();
  }, [refreshAdmin]);

  useEffect(() => {
    const handleExpired = () => logout();
    window.addEventListener('admin-session-expired', handleExpired);
    return () => window.removeEventListener('admin-session-expired', handleExpired);
  }, [logout]);

  const login = useCallback(
    async (credentials: LoginPayload) => {
      const payload = await apiRequest<LoginResponse>(ADMIN_API.login, {
        method: 'POST',
        auth: false,
        body: credentials,
      });
      const token = readToken(payload);
      if (!token) throw new Error('The login response did not include an admin token.');

      adminTokenStorage.set(token);
      const returnedAdmin = readAdmin(payload);
      if (returnedAdmin) {
        setAdmin(returnedAdmin);
      } else {
        await refreshAdmin();
      }
    },
    [refreshAdmin],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      admin,
      isLoading,
      isAuthenticated: Boolean(admin && adminTokenStorage.get()),
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
