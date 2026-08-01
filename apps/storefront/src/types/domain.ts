export interface Category {
  id: string;
  name: string;
  slug?: string;
}

export interface ProductVariant {
  id: string;
  sku?: string;
  size?: string;
  color?: string;
  price?: number | string;
  stock: number;
  image?: string;
}

export interface Product {
  id: string;
  name: string;
  slug?: string;
  description: string;
  price: number | string;
  compareAtPrice?: number | string | null;
  stock: number;
  images: string[];
  isActive: boolean;
  categoryId?: string | null;
  category?: Category | null;
  color?: string;
  material?: string;
  careInstructions?: string[];
  variants?: ProductVariant[];
  tags?: string[];
  createdAt?: string;
}

export interface CartItem {
  key: string;
  product: Product;
  variant?: ProductVariant;
  quantity: number;
}

export interface Customer {
  id: string;
  name?: string | null;
  email: string;
}

export interface OrderItem {
  id: string;
  quantity: number;
  unitPrice?: number | string;
  price?: number | string;
  product?: Pick<Product, 'id' | 'name' | 'images'> | null;
  productName?: string;
  variantLabel?: string;
}

export type OrderStatus = 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export interface Order {
  id: string;
  status: OrderStatus;
  total?: number | string;
  totalAmount?: number | string;
  items: OrderItem[];
  createdAt: string;
  shippingAddress?: Record<string, unknown> | string | null;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
