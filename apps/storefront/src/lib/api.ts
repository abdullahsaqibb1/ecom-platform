import { mockCategories, mockProducts } from '../data/mock';
import type { Category, Collection, ContentPageRecord, Customer, DiscountPreview, Order, OrderCreationResult, Paginated, PaymentMethod, Product, ProductReview, ProductReviewSummary, StorefrontSettings } from '../types/domain';
import { customerSecurityStorage } from './storage';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
const DEMO_FALLBACK = (import.meta.env.VITE_ENABLE_DEMO_FALLBACK ?? 'false') === 'true';

export const STORE_API = {
  products: '/api/products',
  product: (idOrSlug: string) => `/api/products/${idOrSlug}`,
  productReviews: (idOrSlug: string) => `/api/products/${idOrSlug}/reviews`,
  categories: '/api/categories',
  collections: '/api/collections',
  collection: (slug: string) => `/api/collections/${slug}`,
  paymentMethods: '/api/payment-methods',
  storefrontConfig: '/api/storefront/config',
  contentPage: (slug: string) => `/api/content-pages/${slug}`, 
  validateDiscount: '/api/discounts/validate',
  login: '/api/auth/login',
  register: '/api/auth/register',
  me: '/api/me',
  orders: '/api/orders',
  logout: '/api/auth/logout',
} as const;

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(message: string, status = 0, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

type RequestOptions = Omit<RequestInit, 'body'> & { body?: unknown; auth?: boolean };

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, auth = false, headers, ...rest } = options;
  const requestHeaders = new Headers(headers);
  requestHeaders.set('Accept', 'application/json');
  if (body !== undefined) requestHeaders.set('Content-Type', 'application/json');
  const method = String(rest.method || 'GET').toUpperCase();
  if (auth && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const csrfToken = customerSecurityStorage.getCsrf();
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
    throw new ApiError(error instanceof Error ? error.message : 'Unable to reach the API.');
  }

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json() : await response.text();
  if (!response.ok) {
    if (response.status === 401 && auth) {
      customerSecurityStorage.clear();
      window.dispatchEvent(new Event('customer-session-expired'));
    }
    const message = payload && typeof payload === 'object' && 'message' in payload
      ? String((payload as { message: unknown }).message)
      : `Request failed with status ${response.status}.`;
    throw new ApiError(message, response.status, payload);
  }
  return payload as T;
}

function unwrapList<T>(payload: unknown, keys: string[] = []): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    for (const key of [...keys, 'items', 'data', 'results', 'products', 'categories', 'collections', 'paymentMethods', 'orders']) {
      if (Array.isArray(record[key])) return record[key] as T[];
    }
  }
  return [];
}

function unwrapEntity<T>(payload: unknown, keys: string[] = []): T {
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    for (const key of [...keys, 'data', 'product', 'user', 'order']) {
      if (record[key] !== undefined) return record[key] as T;
    }
  }
  return payload as T;
}

export async function getProducts(params: URLSearchParams = new URLSearchParams()): Promise<Paginated<Product>> {
  try {
    const payload = await request<unknown>(`${STORE_API.products}?${params.toString()}`);
    const items = unwrapList<Product>(payload, ['products']);
    const record = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
    const pagination = record.pagination && typeof record.pagination === 'object' ? record.pagination as Record<string, unknown> : record;
    const page = Number(pagination.page ?? 1);
    const limit = Number(pagination.limit ?? 24);
    const total = Number(pagination.total ?? items.length);
    return { items, page, limit, total, totalPages: Number(pagination.totalPages ?? Math.max(1, Math.ceil(total / limit))) };
  } catch (error) {
    if (!DEMO_FALLBACK) throw error;
    const search = params.get('search')?.toLowerCase() ?? '';
    const category = params.get('category')?.toLowerCase() ?? '';
    let items = mockProducts.filter((product) => product.isActive);
    if (search) items = items.filter((product) => `${product.name} ${product.description}`.toLowerCase().includes(search));
    if (category) items = items.filter((product) => [product.categoryId, product.category?.slug, product.category?.name].some((value) => value?.toLowerCase() === category));
    return { items, page: 1, limit: 24, total: items.length, totalPages: 1 };
  }
}

export async function getProduct(idOrSlug: string): Promise<Product> {
  try {
    return unwrapEntity<Product>(await request<unknown>(STORE_API.product(idOrSlug)), ['product']);
  } catch (error) {
    const product = mockProducts.find((item) => item.id === idOrSlug || item.slug === idOrSlug);
    if (!DEMO_FALLBACK || !product) throw error;
    return product;
  }
}


export async function getProductReviews(idOrSlug: string): Promise<{ reviews: ProductReview[]; summary: ProductReviewSummary }> {
  const payload = await request<unknown>(STORE_API.productReviews(idOrSlug));
  if (!payload || typeof payload !== 'object') throw new ApiError('The reviews API returned an invalid response.', 502);
  const record = payload as Record<string, unknown>;
  return {
    reviews: unwrapList<ProductReview>(payload, ['reviews']),
    summary: (record.summary ?? { count: 0, average: 0 }) as ProductReviewSummary,
  };
}

export async function submitProductReview(idOrSlug: string, body: { reviewerName: string; reviewerEmail: string; rating: number; title?: string | null; body: string }): Promise<{ review: ProductReview; message: string }> {
  return request(STORE_API.productReviews(idOrSlug), { method: 'POST', body, auth: true });
}

export async function getCategories(): Promise<Category[]> {
  try {
    return unwrapList<Category>(await request<unknown>(STORE_API.categories), ['categories']);
  } catch (error) {
    if (!DEMO_FALLBACK) throw error;
    return mockCategories;
  }
}


export async function getCollections(): Promise<Collection[]> {
  try {
    return unwrapList<Collection>(await request<unknown>(STORE_API.collections), ['collections']);
  } catch (error) {
    if (!DEMO_FALLBACK) throw error;
    return [];
  }
}

export async function getCollection(slug: string): Promise<{ collection: Collection; products: Paginated<Product> }> {
  const payload = await request<unknown>(STORE_API.collection(slug));
  if (!payload || typeof payload !== 'object') throw new ApiError('The collection API returned an invalid response.', 502);
  const record = payload as Record<string, unknown>;
  const items = unwrapList<Product>(payload, ['products']);
  const pagination = record.pagination && typeof record.pagination === 'object' ? record.pagination as Record<string, unknown> : {};
  return {
    collection: unwrapEntity<Collection>(payload, ['collection']),
    products: {
      items,
      page: Number(pagination.page ?? 1),
      limit: Number(pagination.limit ?? 24),
      total: Number(pagination.total ?? items.length),
      totalPages: Number(pagination.totalPages ?? 1),
    },
  };
}

export async function getPaymentMethods(): Promise<PaymentMethod[]> {
  return unwrapList<PaymentMethod>(await request<unknown>(STORE_API.paymentMethods), ['paymentMethods']);
}

export async function validateDiscount(body: { code: string; customerEmail?: string; items: Array<{ productId: string; variantId?: string | null; quantity: number }> }): Promise<DiscountPreview> {
  return unwrapEntity<DiscountPreview>(await request<unknown>(STORE_API.validateDiscount, { method: 'POST', body, auth: true }), ['discount']);
}

export interface CustomerSessionResponse {
  user: Customer;
  csrfToken?: string | null;
}

export async function loginCustomer(body: { email: string; password: string; turnstileToken?: string }): Promise<CustomerSessionResponse> {
  return request(STORE_API.login, { method: 'POST', body });
}

export async function registerCustomer(body: { name: string; email: string; password: string; turnstileToken?: string }): Promise<CustomerSessionResponse> {
  return request(STORE_API.register, { method: 'POST', body });
}

export async function getMe(): Promise<CustomerSessionResponse> {
  return request(STORE_API.me, { auth: true });
}

export async function logoutCustomer(): Promise<void> {
  await request(STORE_API.logout, { method: 'POST', auth: true });
}

export async function getOrders(): Promise<Order[]> {
  return unwrapList<Order>(await request<unknown>(STORE_API.orders, { auth: true }), ['orders']);
}

export async function createOrder(body: unknown): Promise<OrderCreationResult> {
  const payload = await request<unknown>(STORE_API.orders, { method: 'POST', body, auth: true });
  if (!payload || typeof payload !== 'object') {
    throw new ApiError('The order API returned an invalid response.', 502, payload);
  }
  const record = payload as Record<string, unknown>;
  return {
    order: unwrapEntity<Order>(payload, ['order']),
    payment: (record.payment ?? { method: { id: 'manual', code: 'cod', provider: 'manual', displayName: 'Cash on delivery', requiresOnlinePayment: false, sortOrder: 0 }, checkoutUrl: null }) as OrderCreationResult['payment'],
  };
}


export async function getStorefrontSettings(): Promise<StorefrontSettings> {
  return unwrapEntity<StorefrontSettings>(await request<unknown>(STORE_API.storefrontConfig), ['settings']);
}

export async function getContentPage(slug: string): Promise<ContentPageRecord> {
  return unwrapEntity<ContentPageRecord>(await request<unknown>(STORE_API.contentPage(slug)), ['page']);
}
