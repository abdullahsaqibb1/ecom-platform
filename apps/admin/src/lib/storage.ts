const ADMIN_CSRF_KEY = 'cosmic.admin.csrf';
const LEGACY_ADMIN_TOKEN_KEY = 'ecom.admin.accessToken';

export const adminSecurityStorage = {
  getCsrf(): string | null {
    return sessionStorage.getItem(ADMIN_CSRF_KEY);
  },
  setCsrf(token: string): void {
    sessionStorage.setItem(ADMIN_CSRF_KEY, token);
  },
  clear(): void {
    sessionStorage.removeItem(ADMIN_CSRF_KEY);
    sessionStorage.removeItem(LEGACY_ADMIN_TOKEN_KEY);
  },
};
