import { adminTokenStorage } from './storage';
import type { Paginated } from '../types/domain';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

export const ADMIN_API = {
  login: '/api/admin/auth/login',
  me: '/api/admin/me',
  products: '/api/admin/products',
  product: (id: string) => `/api/admin/products/${id}`,
  categories: '/api/admin/categories',
  category: (id: string) => `/api/admin/categories/${id}`,
  orders: '/api/admin/orders',
  order: (id: string) => `/api/admin/orders/${id}`,
  orderStatus: (id: string) => `/api/admin/orders/${id}/status`,
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
  const token = adminTokenStorage.get();
  const requestHeaders = new Headers(headers);
  requestHeaders.set('Accept', 'application/json');

  if (body !== undefined) requestHeaders.set('Content-Type', 'application/json');
  if (auth && token) requestHeaders.set('Authorization', `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...rest,
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
      adminTokenStorage.clear();
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
