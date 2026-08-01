export type AdminRole = 'STAFF' | 'SUPERADMIN';

export interface Admin {
  id: string;
  name?: string | null;
  email: string;
  role: AdminRole;
  createdAt?: string;
}

export interface Category {
  id: string;
  name: string;
  slug?: string;
  productCount?: number;
  createdAt?: string;
}

export interface ProductVariant {
  id?: string;
  sku: string;
  size?: string | null;
  color?: string | null;
  price?: number | string | null;
  stock: number;
  image?: string | null;
}

export interface Product {
  id: string;
  name: string;
  slug?: string;
  description: string;
  price: number | string;
  stock: number;
  images: string[];
  isActive: boolean;
  categoryId?: string | null;
  category?: Pick<Category, 'id' | 'name'> | null;
  createdAt?: string;
  variants?: ProductVariant[];
  updatedAt?: string;
}

export type OrderStatus =
  | 'PENDING'
  | 'PAID'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

export interface OrderItem {
  id: string;
  quantity: number;
  unitPrice?: number | string;
  price?: number | string;
  product?: Pick<Product, 'id' | 'name' | 'images'> | null;
  productName?: string;
}

export interface CustomerSummary {
  id?: string;
  name?: string | null;
  email?: string | null;
}

export interface Order {
  id: string;
  status: OrderStatus;
  total?: number | string;
  totalAmount?: number | string;
  user?: CustomerSummary | null;
  customer?: CustomerSummary | null;
  items: OrderItem[];
  shippingAddress?: Record<string, unknown> | string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
