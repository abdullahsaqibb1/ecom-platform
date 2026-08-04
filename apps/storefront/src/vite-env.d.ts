/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_ENABLE_DEMO_FALLBACK?: string;
  readonly VITE_STORE_NAME?: string;
  readonly VITE_CURRENCY?: string;
  readonly VITE_FREE_SHIPPING_THRESHOLD?: string;
  readonly VITE_FLAT_SHIPPING_RATE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
