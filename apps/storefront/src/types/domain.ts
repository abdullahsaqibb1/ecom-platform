export interface Category {
  id: string;
  name: string;
  slug?: string;
  description?: string | null;
  image?: string | null;
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  isFeatured?: boolean;
  productCount?: number;
}

export interface CollectionMembership {
  collectionId: string;
  position?: number;
  collection: Collection;
}

export interface ProductVariant {
  id: string;
  sku?: string;
  size?: string;
  color?: string;
  price?: number | string;
  costPrice?: number | string | null;
  stock: number;
  lowStockThreshold?: number;
  barcode?: string | null;
  compatibility?: string[];
  specifications?: Record<string, string> | null;
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
  status?: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  isFeatured?: boolean;
  brand?: string | null;
  model?: string | null;
  barcode?: string | null;
  condition?: string | null;
  warrantyMonths?: number | null;
  compatibility?: string[];
  specifications?: Record<string, string> | null;
  highlights?: string[];
  whatsInBox?: string[];
  categoryId?: string | null;
  category?: Category | null;
  collections?: CollectionMembership[];
  color?: string;
  material?: string;
  careInstructions?: string[];
  variants?: ProductVariant[];
  tags?: string[];
  createdAt?: string;
}

export interface PaymentMethod {
  id: string;
  code: string;
  provider: string;
  displayName: string;
  description?: string | null;
  instructions?: string | null;
  requiresOnlinePayment: boolean;
  sortOrder: number;
}

export interface DiscountPreview {
  code: string;
  name: string;
  type: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING';
  discountTotal: number | string;
  subtotal: number | string;
  shippingTotal: number | string;
  total: number | string;
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
  variantLabel?: string | null;
}

export type OrderStatus = 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
export type PaymentStatus = 'UNPAID' | 'PROCESSING' | 'PAID' | 'FAILED' | 'REFUNDED';

export interface Order {
  id: string;
  status: OrderStatus;
  paymentStatus?: PaymentStatus;
  paymentProvider?: string | null;
  paymentMethodCode?: string | null;
  discountCode?: string | null;
  discountTotal?: number | string;
  taxTotal?: number | string;
  subtotal?: number | string;
  shippingTotal?: number | string;
  total?: number | string;
  totalAmount?: number | string;
  customerNote?: string | null;
  items: OrderItem[];
  createdAt: string;
  shippingAddress?: Record<string, unknown> | string | null;
  carrier?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  estimatedDelivery?: string | null;
  paidAt?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
}

export interface OrderCreationResult {
  order: Order;
  payment: {
    method: PaymentMethod;
    checkoutUrl: string | null;
  };
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
