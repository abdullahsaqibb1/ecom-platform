import { adminSecurityStorage } from './storage';
import type { Paginated } from '../types/domain';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

export const ADMIN_API = {
  login: '/api/admin/auth/login',
  me: '/api/admin/me',
  logout: '/api/admin/auth/logout',
  dashboard: '/api/admin/dashboard',
  storefront: '/api/admin/storefront',
  contentPages: '/api/admin/content-pages',
  contentPage: (id: string) => `/api/admin/content-pages/${id}`, 
  products: '/api/admin/products',
  product: (id: string) => `/api/admin/products/${id}`,
  productPermanent: (id: string) => `/api/admin/products/${id}/permanent`,
  productBulk: '/api/admin/products/bulk',
  categories: '/api/admin/categories',
  category: (id: string) => `/api/admin/categories/${id}`,
  collections: '/api/admin/collections',
  collection: (id: string) => `/api/admin/collections/${id}`,
  inventory: '/api/admin/inventory',
  inventoryMovements: '/api/admin/inventory/movements',
  inventoryAdjust: '/api/admin/inventory/adjust',
  discounts: '/api/admin/discounts',
  discount: (id: string) => `/api/admin/discounts/${id}`,
  paymentMethods: '/api/admin/payment-methods',
  paymentMethod: (id: string) => `/api/admin/payment-methods/${id}`,
  orders: '/api/admin/orders',
  manualOrder: '/api/admin/orders/manual',
  orderExport: '/api/admin/orders/export.csv',
  order: (id: string) => `/api/admin/orders/${id}`,
  orderStatus: (id: string) => `/api/admin/orders/${id}/status`,
  orderPayment: (id: string) => `/api/admin/orders/${id}/payment`,
  orderShipment: (id: string) => `/api/admin/orders/${id}/shipment`,
  orderDelete: (id: string) => `/api/admin/orders/${id}`,
  deletedOrders: '/api/admin/orders/deleted',
  reviews: '/api/admin/reviews',
  review: (id: string) => `/api/admin/reviews/${id}`,
  uploadSignature: '/api/admin/uploads/signature',
  media: '/api/admin/media',
  mediaAsset: (id: string) => `/api/admin/media/${id}`,
  admins: '/api/admin/admins',
} as const;

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  auth?: boolean;
};

function extractMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    for (const key of ['message', 'error', 'detail']) {
      if (typeof record[key] === 'string') return record[key];
    }
  }
  return fallback;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, auth = true, headers, ...rest } = options;
  const requestHeaders = new Headers(headers);
  requestHeaders.set('Accept', 'application/json');

  if (body !== undefined) requestHeaders.set('Content-Type', 'application/json');
  const method = String(rest.method || 'GET').toUpperCase();
  if (auth && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const csrfToken = adminSecurityStorage.getCsrf();
    if (csrfToken) requestHeaders.set('X-CSRF-Token', csrfToken);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      credentials: 'include',
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    throw new ApiError(
      error instanceof Error ? error.message : 'Unable to reach the API.',
      0,
    );
  }

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    if (response.status === 401 && auth) {
      adminSecurityStorage.clear();
      window.dispatchEvent(new Event('admin-session-expired'));
    }
    throw new ApiError(
      extractMessage(payload, `Request failed with status ${response.status}.`),
      response.status,
      payload,
    );
  }

  return payload as T;
}


export async function downloadAdminFile(path: string, filename: string): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { credentials: 'include', headers: { Accept: 'text/csv,*/*' } });
  } catch (error) {
    throw new ApiError(error instanceof Error ? error.message : 'Unable to download the file.', 0);
  }
  if (!response.ok) {
    const payload = await response.text().catch(() => '');
    throw new ApiError(payload || `Download failed with status ${response.status}.`, response.status);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function unwrapEntity<T>(payload: unknown, keys: string[] = []): T {
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    for (const key of [...keys, 'data']) {
      if (record[key] !== undefined) return record[key] as T;
    }
  }
  return payload as T;
}

export function unwrapList<T>(payload: unknown, keys: string[] = []): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    for (const key of [...keys, 'items', 'data', 'results']) {
      if (Array.isArray(record[key])) return record[key] as T[];
    }
  }
  return [];
}

export function unwrapPaginated<T>(
  payload: unknown,
  fallbackPage = 1,
  fallbackLimit = 20,
  keys: string[] = [],
): Paginated<T> {
  const items = unwrapList<T>(payload, keys);
  if (!payload || typeof payload !== 'object') {
    return {
      items,
      page: fallbackPage,
      limit: fallbackLimit,
      total: items.length,
      totalPages: 1,
    };
  }

  const record = payload as Record<string, unknown>;
  const pagination =
    record.pagination && typeof record.pagination === 'object'
      ? (record.pagination as Record<string, unknown>)
      : record;

  const page = Number(pagination.page ?? pagination.currentPage ?? fallbackPage);
  const limit = Number(pagination.limit ?? pagination.pageSize ?? fallbackLimit);
  const total = Number(pagination.total ?? pagination.totalCount ?? items.length);
  const totalPages = Number(
    pagination.totalPages ?? Math.max(1, Math.ceil(total / Math.max(limit, 1))),
  );

  return { items, page, limit, total, totalPages };
}


export interface UploadedMediaAsset {
  id: string;
  publicId: string;
  secureUrl: string;
  format?: string | null;
  width?: number | null;
  height?: number | null;
  bytes?: number | null;
}

interface UploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
  uploadUrl: string;
  allowedFormats?: string;
  maxBytes?: number;
}

interface CloudinaryUploadResponse {
  public_id: string;
  secure_url: string;
  format?: string;
  width?: number;
  height?: number;
  bytes?: number;
  error?: { message?: string };
}

export async function uploadProductImage(file: File): Promise<UploadedMediaAsset> {
  if (!file.type.startsWith('image/')) {
    throw new ApiError('Choose an image file.', 400);
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new ApiError('Images must be 8 MB or smaller.', 400);
  }

  const signature = await apiRequest<UploadSignature>(ADMIN_API.uploadSignature, {
    method: 'POST',
  });
  const form = new FormData();
  form.append('file', file);
  form.append('api_key', signature.apiKey);
  form.append('timestamp', String(signature.timestamp));
  form.append('signature', signature.signature);
  form.append('folder', signature.folder);
  if (signature.allowedFormats) form.append('allowed_formats', signature.allowedFormats);

  let response: Response;
  try {
    response = await fetch(signature.uploadUrl, { method: 'POST', body: form });
  } catch (error) {
    throw new ApiError(error instanceof Error ? error.message : 'Unable to upload the image.', 0);
  }
  const uploaded = await response.json() as CloudinaryUploadResponse;
  if (!response.ok || !uploaded.secure_url || !uploaded.public_id) {
    throw new ApiError(uploaded.error?.message || 'Cloudinary rejected the image upload.', response.status, uploaded);
  }

  const payload = await apiRequest<unknown>(ADMIN_API.media, {
    method: 'POST',
    body: {
      publicId: uploaded.public_id,
      secureUrl: uploaded.secure_url,
      format: uploaded.format ?? null,
      width: uploaded.width ?? null,
      height: uploaded.height ?? null,
      bytes: uploaded.bytes ?? null,
    },
  });
  return unwrapEntity<UploadedMediaAsset>(payload, ['asset']);
}
