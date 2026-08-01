const ADMIN_TOKEN_KEY = 'ecom.admin.accessToken';

export const adminTokenStorage = {
  get(): string | null {
    return sessionStorage.getItem(ADMIN_TOKEN_KEY);
  },
  set(token: string): void {
    sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
  },
  clear(): void {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  },
};
