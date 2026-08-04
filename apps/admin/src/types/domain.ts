export type AdminRole = 'STAFF' | 'SUPERADMIN';
export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

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
  description?: string | null;
  image?: string | null;
  isActive?: boolean;
  sortOrder?: number;
  parentId?: string | null;
  parent?: Pick<Category, 'id' | 'name'> | null;
  productCount?: number;
  childCount?: number;
  createdAt?: string;
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
  productCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CollectionMembership {
  collectionId: string;
  productId?: string;
  position?: number;
  collection: Pick<Collection, 'id' | 'name' | 'slug' | 'isActive'>;
}

export type Specifications = Record<string, string>;

export interface ProductVariant {
  id?: string;
  sku: string;
  size?: string | null;
  color?: string | null;
  price?: number | string | null;
  costPrice?: number | string | null;
  stock: number;
  lowStockThreshold?: number;
  barcode?: string | null;
  compatibility?: string[];
  specifications?: Specifications | null;
  image?: string | null;
}

export interface Product {
  id: string;
  name: string;
  slug?: string;
  description: string;
  price: number | string;
  compareAtPrice?: number | string | null;
  costPrice?: number | string | null;
  stock: number;
  lowStockThreshold?: number;
  images: string[];
  isActive: boolean;
  status?: ProductStatus;
  isFeatured?: boolean;
  brand?: string | null;
  model?: string | null;
  barcode?: string | null;
  condition?: string | null;
  warrantyMonths?: number | null;
  compatibility?: string[];
  specifications?: Specifications | null;
  highlights?: string[];
  whatsInBox?: string[];
  seoTitle?: string | null;
  seoDescription?: string | null;
  tags?: string[];
  categoryId?: string | null;
  category?: Pick<Category, 'id' | 'name'> | null;
  collections?: CollectionMembership[];
  createdAt?: string;
  variants?: ProductVariant[];
  updatedAt?: string;
}

export type InventoryMovementType = 'INITIAL' | 'ADJUSTMENT' | 'SALE' | 'CANCELLATION' | 'RETURN' | 'DAMAGE' | 'RESTOCK';
export interface InventoryMovement {
  id: string;
  type: InventoryMovementType;
  quantityChange: number;
  stockAfter: number;
  reason?: string | null;
  reference?: string | null;
  product: Pick<Product, 'id' | 'name' | 'images'>;
  variant?: Pick<ProductVariant, 'id' | 'sku' | 'size' | 'color'> | null;
  admin?: Pick<Admin, 'name' | 'email'> | null;
  createdAt: string;
}

export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING';
export type DiscountScope = 'ALL_PRODUCTS' | 'PRODUCTS' | 'CATEGORIES' | 'COLLECTIONS';
export interface Discount {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  type: DiscountType;
  scope: DiscountScope;
  value: number | string;
  minimumOrderAmount?: number | string | null;
  maximumDiscountAmount?: number | string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  usageLimit?: number | null;
  usageCount: number;
  perCustomerLimit?: number | null;
  productIds: string[];
  categoryIds: string[];
  collectionIds: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface PaymentMethod {
  id: string;
  code: string;
  provider: string;
  displayName: string;
  description?: string | null;
  instructions?: string | null;
  isEnabled: boolean;
  requiresOnlinePayment: boolean;
  sortOrder: number;
  configuration?: Specifications | null;
  environmentReady?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type OrderStatus = 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
export type PaymentStatus = 'UNPAID' | 'PROCESSING' | 'PAID' | 'FAILED' | 'REFUNDED';

export interface OrderItem {
  id: string;
  quantity: number;
  unitPrice?: number | string;
  price?: number | string;
  product?: Pick<Product, 'id' | 'name' | 'images'> | null;
  productName?: string;
  variantLabel?: string | null;
}

export interface CustomerSummary {
  id?: string;
  name?: string | null;
  email?: string | null;
}

export interface Order {
  id: string;
  status: OrderStatus;
  paymentStatus?: PaymentStatus;
  paymentProvider?: string | null;
  paymentMethodCode?: string | null;
  paymentReference?: string | null;
  paymentTracker?: string | null;
  discountCode?: string | null;
  discountTotal?: number | string;
  taxTotal?: number | string;
  subtotal?: number | string;
  shippingTotal?: number | string;
  total?: number | string;
  totalAmount?: number | string;
  customerNote?: string | null;
  user?: CustomerSummary | null;
  customer?: CustomerSummary | null;
  items: OrderItem[];
  shippingAddress?: Record<string, unknown> | string | null;
  carrier?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  estimatedDelivery?: string | null;
  paidAt?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface DashboardMetrics {
  productCount: number;
  activeProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  collectionCount: number;
  activeDiscounts: number;
  orderCount: number;
  revenue: number | string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
