require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcrypt');
const slugify = require('slugify');
const { Prisma } = require('@prisma/client');
const prisma = require('./prisma');
const { AppError, asyncRoute, validate } = require('./errors');
const {
  signCustomerToken,
  signAdminToken,
  requireCustomer,
  optionalCustomer,
  requireAdmin,
  requireSuperadmin,
  legacyBearerEnabled,
} = require('./auth');
const {
  customerRegisterSchema,
  loginSchema,
  adminCreateSchema,
  categoryCreateSchema,
  categoryUpdateSchema,
  collectionCreateSchema,
  collectionUpdateSchema,
  productCreateSchema,
  productUpdateSchema,
  productBulkActionSchema,
  inventoryAdjustmentSchema,
  discountCreateSchema,
  discountUpdateSchema,
  discountValidateSchema,
  paymentMethodCreateSchema,
  paymentMethodUpdateSchema,
  orderCreateSchema,
  manualOrderCreateSchema,
  reviewSubmitSchema,
  adminReviewCreateSchema,
  adminReviewUpdateSchema,
  manualPaymentSchema,
  orderStatusSchema,
  shipmentSchema,
  storefrontSettingsSchema,
  contentPageCreateSchema,
  contentPageUpdateSchema,
  orderDeleteSchema,
  mediaCreateSchema,
} = require('./schemas');
const {
  createSafepayCheckout,
  parseSafepayWebhook,
  toLowestDenomination,
  verifySafepayWebhook,
} = require('./safepay');
const { emailEvents } = require('./email');
const { createUploadSignature, verifyUploadedAsset, destroyAsset } = require('./cloudinary');
const { defaultStorefrontData, publicStorefrontSettings } = require('./storefront-config');
const {
  paymentProviderReady,
  publicPaymentMethod,
  enabledPaymentMethods,
  getPaymentMethod,
  evaluateDiscount,
  createInventoryMovement,
} = require('./commerce');
const {
  createCustomerSession,
  createAdminSession,
  rotateCustomerCsrf,
  rotateAdminCsrf,
  revokeCustomerSession,
  revokeAdminSession,
  protectShippingAddress,
  revealShippingAddress,
  verifyTurnstile,
  forceHttps,
} = require('./security');

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');

function splitOrigins(value) {
  return (value || '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

const allowedOrigins = new Set([
  ...(process.env.NODE_ENV !== 'production' || process.env.ALLOW_LOCAL_ORIGINS === 'true'
    ? ['http://localhost:5173', 'http://localhost:5174']
    : []),
  ...splitOrigins(process.env.CUSTOMER_ORIGINS),
  ...splitOrigins(process.env.ADMIN_ORIGINS),
]);

app.use(forceHttps);
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      baseUri: ["'none'"],
      frameAncestors: ["'none'"],
      formAction: ["'none'"],
      objectSrc: ["'none'"],
    },
  },
  hsts: process.env.NODE_ENV === 'production'
    ? { maxAge: 31536000, includeSubDomains: true, preload: true }
    : false,
  referrerPolicy: { policy: 'no-referrer' },
}));
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin.replace(/\/$/, ''))) return callback(null, true);
    return callback(new AppError(403, 'This origin is not allowed by CORS.'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  exposedHeaders: ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
  maxAge: 86400,
}));
app.use(express.json({
  limit: '1mb',
  verify(req, _res, buffer) {
    if (req.originalUrl === '/api/webhooks/safepay') {
      req.rawBody = Buffer.from(buffer);
    }
  },
}));

app.param('id', (req, _res, next, value) => {
  if (!isUuid(value)) return next(new AppError(400, 'The record identifier is invalid.'));
  return next();
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 350,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many requests. Please try again later.' },
});
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { message: 'Too many sign-in attempts. Wait 15 minutes and try again.' },
});
const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many account-creation attempts. Please try again later.' },
});
const orderLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many order attempts. Please try again later.' },
});
const reviewLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many review submissions. Please try again later.' },
});
const adminMutationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 180,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many administrative changes. Please wait and retry.' },
});
app.use('/api', apiLimiter);
app.use('/api/auth/login', loginLimiter);
app.use('/api/admin/auth/login', loginLimiter);
app.use('/api/auth/register', registrationLimiter);
app.use('/api/orders', (req, res, next) => req.method === 'POST' ? orderLimiter(req, res, next) : next());
app.use('/api/products', (req, res, next) => req.method === 'POST' && req.path.endsWith('/reviews') ? reviewLimiter(req, res, next) : next());
app.use('/api/admin', (req, res, next) => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) ? adminMutationLimiter(req, res, next) : next());

const productInclude = {
  category: { select: { id: true, name: true, slug: true } },
  collections: {
    include: { collection: { select: { id: true, name: true, slug: true, isActive: true } } },
    orderBy: { position: 'asc' },
  },
  variants: { orderBy: [{ color: 'asc' }, { size: 'asc' }] },
};
const orderInclude = {
  user: { select: { id: true, name: true, email: true } },
  createdByAdmin: { select: { id: true, name: true, email: true } },
  items: {
    include: {
      product: { select: { id: true, name: true, images: true } },
      variant: { select: { id: true, sku: true, size: true, color: true, image: true } },
    },
  },
};

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt };
}

function publicVariant(variant) {
  if (!variant) return variant;
  const {
    costPrice: _costPrice,
    lowStockThreshold: _lowStockThreshold,
    ...safe
  } = variant;
  return safe;
}

function publicProduct(product) {
  if (!product) return product;
  const {
    costPrice: _costPrice,
    lowStockThreshold: _lowStockThreshold,
    inventoryMovements: _inventoryMovements,
    orderItems: _orderItems,
    ...safe
  } = product;
  if (Array.isArray(safe.variants)) safe.variants = safe.variants.map(publicVariant);
  return safe;
}

function publicOrder(order) {
  if (!order) return order;
  const revealed = revealShippingAddress(order);
  const {
    paymentTracker: _paymentTracker,
    paymentReference: _paymentReference,
    paymentEvents: _paymentEvents,
    notifications: _notifications,
    user: _user,
    createdByAdmin: _createdByAdmin,
    createdByAdminId: _createdByAdminId,
    sourceNote: _sourceNote,
    ...safe
  } = revealed;
  if (Array.isArray(safe.items)) {
    safe.items = safe.items.map((item) => {
      const { unitCost: _unitCost, ...safeItem } = item;
      if (safeItem.product) safeItem.product = publicProduct(safeItem.product);
      if (safeItem.variant) safeItem.variant = publicVariant(safeItem.variant);
      return safeItem;
    });
  }
  return safe;
}

function adminOrder(order) {
  return revealShippingAddress(order);
}

function baseSlug(value) {
  return slugify(value, { lower: true, strict: true, trim: true }) || 'item';
}

async function uniqueProductSlug(name, requested, excludeId) {
  const root = baseSlug(requested || name);
  let candidate = root;
  let suffix = 2;
  while (await prisma.product.findFirst({
    where: { slug: candidate, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true },
  })) {
    candidate = `${root}-${suffix++}`;
  }
  return candidate;
}

async function uniqueSlugFor(model, name, requested, excludeId) {
  const root = baseSlug(requested || name);
  let candidate = root;
  let suffix = 2;
  while (await prisma[model].findFirst({
    where: { slug: candidate, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true },
  })) {
    candidate = `${root}-${suffix++}`;
  }
  return candidate;
}

async function uniqueCategorySlug(name, requested, excludeId) {
  return uniqueSlugFor('category', name, requested, excludeId);
}

async function uniqueCollectionSlug(name, requested, excludeId) {
  return uniqueSlugFor('collection', name, requested, excludeId);
}

async function assertValidCategoryParent(categoryId, parentId) {
  if (!parentId) return;
  if (categoryId && parentId === categoryId) throw new AppError(400, 'A category cannot be its own parent.');
  const visited = new Set();
  let cursor = parentId;
  while (cursor) {
    if (visited.has(cursor)) throw new AppError(409, 'The existing category tree contains a cycle.');
    visited.add(cursor);
    if (categoryId && cursor === categoryId) throw new AppError(400, 'A category cannot be moved below one of its descendants.');
    const category = await prisma.category.findUnique({ where: { id: cursor }, select: { parentId: true } });
    if (!category) throw new AppError(400, 'Parent category was not found.');
    cursor = category.parentId;
  }
}

function assertDiscountTargeting(value) {
  const targetMap = {
    PRODUCTS: value.productIds,
    CATEGORIES: value.categoryIds,
    COLLECTIONS: value.collectionIds,
  };
  if (value.scope !== 'ALL_PRODUCTS' && !(targetMap[value.scope] || []).length) {
    throw new AppError(400, 'Choose at least one target for this discount scope.');
  }
}

function cleanProductData(input, slug) {
  const {
    variants,
    collectionIds,
    price,
    compareAtPrice,
    costPrice,
    categoryId,
    ...rest
  } = input;
  const status = rest.status || (rest.isActive === false ? 'ARCHIVED' : 'ACTIVE');
  return {
    ...rest,
    status,
    isActive: status === 'ACTIVE' && rest.isActive !== false,
    slug,
    price: new Prisma.Decimal(price),
    compareAtPrice: compareAtPrice == null ? null : new Prisma.Decimal(compareAtPrice),
    costPrice: costPrice == null ? null : new Prisma.Decimal(costPrice),
    categoryId: categoryId || null,
  };
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function parsePagination(query, maxLimit = 100) {
  const page = Math.max(1, Number.parseInt(String(query.page || '1'), 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, Number.parseInt(String(query.limit || '24'), 10) || 24));
  return { page, limit, skip: (page - 1) * limit };
}

function queryText(value, name, maxLength) {
  if (value == null || value === '') return '';
  if (typeof value !== 'string') throw new AppError(400, `${name} must be a single text value.`);
  const cleaned = value.trim();
  if (cleaned.length > maxLength) throw new AppError(400, `${name} is too long.`);
  return cleaned;
}

function queryChoice(value, name, allowed, fallback) {
  const cleaned = queryText(value, name, 50);
  if (!cleaned) return fallback;
  if (!allowed.includes(cleaned)) throw new AppError(400, `${name} has an unsupported value.`);
  return cleaned;
}

function decimalFromEnv(name, fallback) {
  const value = process.env[name]?.trim() || String(fallback);
  try {
    const decimal = new Prisma.Decimal(value);
    if (decimal.isNegative()) throw new Error('negative');
    return decimal;
  } catch {
    throw new AppError(500, `${name} must be a non-negative number.`);
  }
}

function storefrontBaseUrl() {
  return (process.env.STOREFRONT_URL || 'https://cosmictech.digital').trim().replace(/\/$/, '');
}

async function restoreOrderInventory(tx, order) {
  for (const item of order.items) {
    const product = await tx.product.update({
      where: { id: item.productId },
      data: { stock: { increment: item.quantity } },
      select: { id: true, stock: true },
    });
    await createInventoryMovement(tx, {
      productId: item.productId,
      type: 'CANCELLATION',
      quantityChange: item.quantity,
      stockAfter: product.stock,
      reason: 'Order inventory restored',
      reference: order.id,
    });
    if (item.variantId) {
      const variant = await tx.productVariant.update({
        where: { id: item.variantId },
        data: { stock: { increment: item.quantity } },
        select: { id: true, stock: true },
      });
      await createInventoryMovement(tx, {
        productId: item.productId,
        variantId: item.variantId,
        type: 'CANCELLATION',
        quantityChange: item.quantity,
        stockAfter: variant.stock,
        reason: 'Order variant inventory restored',
        reference: order.id,
      });
    }
  }
}

async function prepareRequestedItems(tx, items, { checkStock = true } = {}) {
  const prepared = [];
  let subtotal = new Prisma.Decimal(0);
  for (const requested of items) {
    const product = await tx.product.findUnique({
      where: { id: requested.productId },
      include: { variants: true, collections: true },
    });
    if (!product || !product.isActive || product.status !== 'ACTIVE') {
      throw new AppError(404, 'One of the selected products is unavailable.');
    }
    let variant = null;
    if (requested.variantId) {
      variant = product.variants.find((item) => item.id === requested.variantId) || null;
      if (!variant) throw new AppError(400, `The selected configuration for ${product.name} is invalid.`);
    } else if (product.variants.length > 0) {
      throw new AppError(400, `Select a configuration for ${product.name}.`);
    }
    const available = variant ? variant.stock : product.stock;
    if (checkStock && available < requested.quantity) {
      throw new AppError(409, `${product.name} does not have enough stock.`);
    }
    const unitPrice = variant?.price || product.price;
    subtotal = subtotal.plus(unitPrice.mul(requested.quantity));
    prepared.push({ product, variant, requested, unitPrice });
  }
  return { prepared, subtotal };
}

async function allocatePreparedInventory(tx, prepared, { adminId = null, reason = 'Inventory allocated to order' } = {}) {
  const movements = [];
  for (const item of prepared) {
    if (item.variant) {
      const changedVariant = await tx.productVariant.updateMany({
        where: { id: item.variant.id, stock: { gte: item.requested.quantity } },
        data: { stock: { decrement: item.requested.quantity } },
      });
      if (changedVariant.count !== 1) throw new AppError(409, `${item.product.name} stock changed. Please retry.`);
      const updatedVariant = await tx.productVariant.findUnique({ where: { id: item.variant.id }, select: { stock: true } });
      movements.push({
        productId: item.product.id,
        variantId: item.variant.id,
        adminId,
        type: 'SALE',
        quantityChange: -item.requested.quantity,
        stockAfter: updatedVariant.stock,
        reason,
      });
    }
    const changedProduct = await tx.product.updateMany({
      where: { id: item.product.id, stock: { gte: item.requested.quantity } },
      data: { stock: { decrement: item.requested.quantity } },
    });
    if (changedProduct.count !== 1) throw new AppError(409, `${item.product.name} stock changed. Please retry.`);
    const updatedProduct = await tx.product.findUnique({ where: { id: item.product.id }, select: { stock: true } });
    movements.push({
      productId: item.product.id,
      adminId,
      type: 'SALE',
      quantityChange: -item.requested.quantity,
      stockAfter: updatedProduct.stock,
      reason,
    });
  }
  return movements;
}

function publicReview(review) {
  return {
    id: review.id,
    productId: review.productId,
    reviewerName: review.reviewerName,
    rating: review.rating,
    title: review.title,
    body: review.body,
    source: review.source,
    isFeatured: review.isFeatured,
    isVerifiedPurchase: review.isVerifiedPurchase,
    editedByAdminAt: review.editedByAdminAt,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
  };
}

function csvCell(value) {
  if (value == null) return '';
  const text = value instanceof Date ? value.toISOString() : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function orderExportRows(orders) {
  const headers = [
    'order_id', 'order_number', 'source', 'source_note', 'created_at', 'updated_at', 'status', 'payment_status',
    'payment_provider', 'payment_method_code', 'payment_reference', 'discount_code', 'discount_total', 'tax_total',
    'subtotal', 'shipping_total', 'total', 'customer_note', 'customer_user_id', 'customer_name', 'customer_email',
    'customer_phone', 'shipping_full_name', 'shipping_phone', 'shipping_address1', 'shipping_city', 'shipping_province',
    'shipping_postal_code', 'carrier', 'tracking_number', 'tracking_url', 'estimated_delivery', 'paid_at', 'shipped_at',
    'delivered_at', 'created_by_admin_id', 'created_by_admin_name', 'created_by_admin_email', 'item_id', 'product_id',
    'product_name', 'variant_id', 'variant_sku', 'variant_configuration', 'quantity', 'unit_price', 'line_total',
    'unit_cost', 'line_cost',
  ];
  const rows = [headers];
  for (const rawOrder of orders) {
    const order = revealShippingAddress(rawOrder);
    const address = order.shippingAddress && typeof order.shippingAddress === 'object' ? order.shippingAddress : {};
    const customerName = order.user?.name || address.fullName || '';
    const customerEmail = order.customerEmail || order.user?.email || '';
    for (const item of order.items || []) {
      const lineTotal = decimalNumber(item.unitPrice) * item.quantity;
      const lineCost = decimalNumber(item.unitCost) * item.quantity;
      rows.push([
        order.id, order.id.slice(-8).toUpperCase(), order.source, order.sourceNote, order.createdAt, order.updatedAt, order.status,
        order.paymentStatus, order.paymentProvider, order.paymentMethodCode, order.paymentReference, order.discountCode,
        order.discountTotal, order.taxTotal, order.subtotal, order.shippingTotal, order.total, order.customerNote, order.userId,
        customerName, customerEmail, order.customerPhone || address.phone || '', address.fullName || '', address.phone || '',
        address.address1 || '', address.city || '', address.province || '', address.postalCode || '', order.carrier,
        order.trackingNumber, order.trackingUrl, order.estimatedDelivery, order.paidAt, order.shippedAt, order.deliveredAt,
        order.createdByAdminId, order.createdByAdmin?.name || '', order.createdByAdmin?.email || '', item.id, item.productId,
        item.productName, item.variantId, item.variant?.sku || '', item.variantLabel || '', item.quantity, item.unitPrice,
        lineTotal, item.unitCost, lineCost,
      ]);
    }
  }
  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
}

async function attemptSideEffect(promise) {
  try {
    await promise;
  } catch (error) {
    console.error('Side effect failed:', error);
  }
}

function decimalNumber(value) {
  if (value == null) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function financeRange(value) {
  const allowed = { '7d': 7, '30d': 30, '90d': 90, '365d': 365 };
  if (!value || value === '30d') return { key: '30d', days: 30, start: new Date(Date.now() - 30 * 86400000) };
  if (value === 'all') return { key: 'all', days: null, start: null };
  const days = allowed[value];
  if (!days) throw new AppError(400, 'Finance range must be 7d, 30d, 90d, 365d, or all.');
  return { key: value, days, start: new Date(Date.now() - days * 86400000) };
}

function orderItemCost(item) {
  return decimalNumber(item.unitCost ?? item.variant?.costPrice ?? item.product?.costPrice);
}

async function enrichProductsWithSales(products) {
  if (!products.length) return products;
  const rows = await prisma.orderItem.findMany({
    where: {
      productId: { in: products.map((product) => product.id) },
      order: { paymentStatus: 'PAID', status: { not: 'CANCELLED' } },
    },
    select: {
      productId: true, quantity: true, unitPrice: true, unitCost: true,
      order: { select: { subtotal: true, discountTotal: true } },
      product: { select: { costPrice: true } },
      variant: { select: { costPrice: true } },
    },
  });
  const metrics = new Map();
  for (const row of rows) {
    const current = metrics.get(row.productId) || { unitsSold: 0, revenue: 0, cost: 0, grossProfit: 0 };
    const rawRevenue = decimalNumber(row.unitPrice) * row.quantity;
    const subtotal = decimalNumber(row.order.subtotal);
    const discountTotal = decimalNumber(row.order.discountTotal);
    const discountFactor = subtotal > 0 ? Math.max(0, (subtotal - discountTotal) / subtotal) : 1;
    const revenue = rawRevenue * discountFactor;
    const cost = orderItemCost(row) * row.quantity;
    current.unitsSold += row.quantity;
    current.revenue += revenue;
    current.cost += cost;
    current.grossProfit += revenue - cost;
    metrics.set(row.productId, current);
  }
  return products.map((product) => ({
    ...product,
    salesMetrics: metrics.get(product.id) || { unitsSold: 0, revenue: 0, cost: 0, grossProfit: 0 },
  }));
}

async function buildFinanceDashboard(rangeKey) {
  const range = financeRange(rangeKey);
  const paidWhere = {
    paymentStatus: 'PAID',
    status: { not: 'CANCELLED' },
    ...(range.start ? { OR: [{ paidAt: { gte: range.start } }, { paidAt: null, createdAt: { gte: range.start } }] } : {}),
  };
  const [paidOrders, inventoryProducts] = await Promise.all([
    prisma.order.findMany({
      where: paidWhere,
      select: {
        id: true, total: true, subtotal: true, discountTotal: true, shippingTotal: true, paidAt: true, createdAt: true,
        items: {
          select: {
            productId: true, productName: true, quantity: true, unitPrice: true, unitCost: true,
            product: { select: { costPrice: true } },
            variant: { select: { costPrice: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.product.findMany({
      where: { status: { not: 'ARCHIVED' } },
      select: { id: true, name: true, stock: true, price: true, costPrice: true, variants: { select: { stock: true, price: true, costPrice: true } } },
    }),
  ]);

  let totalRevenue = 0;
  let productRevenue = 0;
  let shippingRevenue = 0;
  let discounts = 0;
  let cogs = 0;
  let salesMissingCostUnits = 0;
  const timelineMap = new Map();
  const topMap = new Map();
  for (const order of paidOrders) {
    const orderTotal = decimalNumber(order.total);
    const orderDiscount = decimalNumber(order.discountTotal);
    const orderProductRevenue = Math.max(0, decimalNumber(order.subtotal) - orderDiscount);
    totalRevenue += orderTotal;
    productRevenue += orderProductRevenue;
    shippingRevenue += decimalNumber(order.shippingTotal);
    discounts += orderDiscount;
    let orderCost = 0;
    const subtotalBeforeDiscount = decimalNumber(order.subtotal);
    const discountFactor = subtotalBeforeDiscount > 0 ? orderProductRevenue / subtotalBeforeDiscount : 1;
    for (const item of order.items) {
      const lineRevenue = decimalNumber(item.unitPrice) * item.quantity * discountFactor;
      const itemUnitCost = orderItemCost(item);
      const lineCost = itemUnitCost * item.quantity;
      if (item.unitCost == null && item.variant?.costPrice == null && item.product?.costPrice == null) salesMissingCostUnits += item.quantity;
      orderCost += lineCost;
      const current = topMap.get(item.productId) || { productId: item.productId, name: item.productName, unitsSold: 0, revenue: 0, cost: 0, grossProfit: 0 };
      current.unitsSold += item.quantity;
      current.revenue += lineRevenue;
      current.cost += lineCost;
      current.grossProfit += lineRevenue - lineCost;
      topMap.set(item.productId, current);
    }
    cogs += orderCost;
    const date = order.paidAt || order.createdAt;
    const key = date.toISOString().slice(0, 10);
    const point = timelineMap.get(key) || { date: key, revenue: 0, cost: 0, profit: 0, orders: 0 };
    point.revenue += orderProductRevenue;
    point.cost += orderCost;
    point.profit += orderProductRevenue - orderCost;
    point.orders += 1;
    timelineMap.set(key, point);
  }

  let inventoryInvestment = 0;
  let inventoryRetailValue = 0;
  let inventoryUnits = 0;
  let inventoryMissingCostUnits = 0;
  for (const product of inventoryProducts) {
    if (product.variants.length) {
      for (const variant of product.variants) {
        inventoryUnits += variant.stock;
        const hasCost = variant.costPrice != null || product.costPrice != null;
        if (!hasCost) inventoryMissingCostUnits += variant.stock;
        inventoryInvestment += variant.stock * decimalNumber(variant.costPrice ?? product.costPrice);
        inventoryRetailValue += variant.stock * decimalNumber(variant.price ?? product.price);
      }
    } else {
      inventoryUnits += product.stock;
      if (product.costPrice == null) inventoryMissingCostUnits += product.stock;
      inventoryInvestment += product.stock * decimalNumber(product.costPrice);
      inventoryRetailValue += product.stock * decimalNumber(product.price);
    }
  }

  const grossProfit = productRevenue - cogs;
  return {
    range: range.key,
    paidOrderCount: paidOrders.length,
    totalRevenue,
    productRevenue,
    shippingRevenue,
    discounts,
    cogs,
    grossProfit,
    grossMargin: productRevenue > 0 ? (grossProfit / productRevenue) * 100 : 0,
    averageOrderValue: paidOrders.length ? totalRevenue / paidOrders.length : 0,
    inventoryInvestment,
    inventoryRetailValue,
    inventoryPotentialProfit: inventoryRetailValue - inventoryInvestment,
    inventoryUnits,
    inventoryMissingCostUnits,
    salesMissingCostUnits,
    timeline: Array.from(timelineMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
    topProducts: Array.from(topMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 8),
  };
}

app.get('/', (_req, res) => {
  res.json({
    name: 'E-commerce API',
    status: 'ok',
    health: '/health',
    customerApi: '/api',
    adminApi: '/api/admin',
  });
});

app.get('/health', asyncRoute(async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
}));

// Safepay is the source of truth for payment completion. A browser redirect never marks an order paid.
app.post('/api/webhooks/safepay', asyncRoute(async (req, res) => {
  const signature = req.get('x-sfpy-signature');
  if (!verifySafepayWebhook(req.rawBody, signature, req.body)) {
    throw new AppError(401, 'Invalid Safepay webhook signature.');
  }

  const event = parseSafepayWebhook(req.body);
  const supportedEvents = new Set(['payment.succeeded', 'payment.failed', 'payment.refunded']);
  if (!supportedEvents.has(event.eventType)) {
    return res.json({ received: true, ignored: true, eventType: event.eventType });
  }

  const configuredApiKey = process.env.SAFEPAY_API_KEY?.trim();
  if (configuredApiKey && event.merchantApiKey && event.merchantApiKey !== configuredApiKey) {
    throw new AppError(400, 'Safepay merchant key does not match this store.');
  }

  let current = null;
  if (event.orderId && isUuid(event.orderId)) {
    current = await prisma.order.findUnique({
      where: { id: event.orderId },
      include: orderInclude,
    });
  }
  if (!current && event.tracker) {
    current = await prisma.order.findFirst({
      where: { paymentTracker: event.tracker },
      include: orderInclude,
    });
  }
  if (!current) throw new AppError(404, 'Webhook order was not found.');

  if (event.outcome === 'PAID') {
    if (event.amountMinor == null) {
      throw new AppError(400, 'Safepay success event is missing the charged amount.');
    }
    if (!/^[0-9]+$/.test(event.amountMinor)
      || BigInt(event.amountMinor) !== BigInt(toLowestDenomination(current.total))) {
      throw new AppError(400, 'Safepay amount does not match the order total.');
    }
    if (event.currency !== 'PKR') {
      throw new AppError(400, 'Safepay currency does not match this store.');
    }
  }

  let duplicate = false;
  let order = current;
  try {
    order = await prisma.$transaction(async (tx) => {
      await tx.paymentEvent.create({
        data: {
          orderId: current.id,
          provider: 'safepay',
          eventId: event.eventId,
          eventType: event.eventType,
          payload: event.payload,
        },
      });

      if (event.outcome === 'PAID' && current.paymentStatus !== 'PAID') {
        return tx.order.update({
          where: { id: current.id },
          data: {
            status: current.status === 'PENDING' ? 'PAID' : current.status,
            paymentStatus: 'PAID',
            paymentProvider: 'safepay',
            paymentReference: event.eventId,
            paymentTracker: event.tracker || current.paymentTracker,
            paidAt: current.paidAt || new Date(),
          },
          include: orderInclude,
        });
      }

      if (event.outcome === 'REFUNDED' && current.paymentStatus !== 'REFUNDED') {
        return tx.order.update({
          where: { id: current.id },
          data: {
            paymentStatus: 'REFUNDED',
            paymentReference: event.eventId,
            paymentTracker: event.tracker || current.paymentTracker,
          },
          include: orderInclude,
        });
      }

      // A failed attempt is recorded but does not close the order: Safepay lets the shopper retry
      // the same hosted checkout session and can send multiple payment.failed events per tracker.
      return current;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      duplicate = true;
      order = await prisma.order.findUnique({ where: { id: current.id }, include: orderInclude });
    } else {
      throw error;
    }
  }

  if (event.outcome === 'PAID' && order) {
    await attemptSideEffect(emailEvents.paymentConfirmed(order));
  }
  return res.json({
    received: true,
    duplicate,
    eventType: event.eventType,
    outcome: event.outcome,
  });
}));

// Customer authentication uses an opaque HttpOnly session cookie. Legacy bearer tokens can be enabled temporarily during migration.
app.post('/api/auth/register', asyncRoute(async (req, res) => {
  const body = validate(customerRegisterSchema, req.body);
  await verifyTurnstile(body.turnstileToken, req);
  const exists = await prisma.user.findUnique({ where: { email: body.email }, select: { id: true } });
  if (exists) throw new AppError(409, 'A customer account with this email already exists.');
  const user = await prisma.user.create({
    data: {
      name: body.name,
      email: body.email,
      passwordHash: await bcrypt.hash(body.password, 12),
    },
  });
  const { csrfToken } = await createCustomerSession(prisma, req, res, user.id);
  res.status(201).json({
    user: publicUser(user),
    csrfToken,
    ...(legacyBearerEnabled() ? { token: signCustomerToken(user.id) } : {}),
  });
}));

app.post('/api/auth/login', asyncRoute(async (req, res) => {
  const body = validate(loginSchema, req.body);
  await verifyTurnstile(body.turnstileToken, req);
  const user = await prisma.user.findUnique({ where: { email: body.email } });
  if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
    throw new AppError(401, 'Invalid customer email or password.');
  }
  const { csrfToken } = await createCustomerSession(prisma, req, res, user.id);
  res.json({
    user: publicUser(user),
    csrfToken,
    ...(legacyBearerEnabled() ? { token: signCustomerToken(user.id) } : {}),
  });
}));

app.get('/api/me', requireCustomer, asyncRoute(async (req, res) => {
  const csrfToken = req.customerSession
    ? await rotateCustomerCsrf(prisma, req.customerSession.id)
    : null;
  res.json({ user: req.customer, csrfToken });
}));

app.post('/api/auth/logout', requireCustomer, asyncRoute(async (req, res) => {
  await revokeCustomerSession(prisma, req, res);
  res.status(204).send();
}));

// Public catalog and checkout configuration.
app.get('/api/categories', asyncRoute(async (_req, res) => {
  const categories = await prisma.category.findMany({
    where: { isActive: true, products: { some: { isActive: true, status: 'ACTIVE' } } },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, slug: true, description: true, image: true, parentId: true },
  });
  res.json({ categories });
}));

app.get('/api/collections', asyncRoute(async (_req, res) => {
  const collections = await prisma.collection.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { products: true } } },
  });
  res.json({ collections: collections.map(({ _count, ...collection }) => ({ ...collection, productCount: _count.products })) });
}));

app.get('/api/collections/:slug', asyncRoute(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const collection = await prisma.collection.findFirst({ where: { slug: req.params.slug, isActive: true } });
  if (!collection) throw new AppError(404, 'Collection not found.');
  const where = { collectionId: collection.id, product: { isActive: true, status: 'ACTIVE' } };
  const [memberships, total] = await prisma.$transaction([
    prisma.collectionProduct.findMany({ where, include: { product: { include: productInclude } }, orderBy: { position: 'asc' }, skip, take: limit }),
    prisma.collectionProduct.count({ where }),
  ]);
  res.json({
    collection,
    products: memberships.map((membership) => publicProduct(membership.product)),
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  });
}));

app.get('/api/payment-methods', asyncRoute(async (_req, res) => {
  const methods = await enabledPaymentMethods(prisma);
  res.json({ paymentMethods: methods.map(publicPaymentMethod) });
}));

app.get('/api/storefront/config', asyncRoute(async (_req, res) => {
  const settings = await prisma.storefrontSettings.findUnique({ where: { id: 'primary' } });
  res.json({ settings: publicStorefrontSettings(settings) });
}));

app.get('/api/content-pages/:slug', asyncRoute(async (req, res) => {
  const page = await prisma.contentPage.findFirst({ where: { slug: req.params.slug, isPublished: true } });
  if (!page) throw new AppError(404, 'Page not found.');
  res.json({ page });
}));

app.get('/api/products', asyncRoute(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const search = queryText(req.query.search, 'search', 120);
  const category = queryText(req.query.category, 'category', 140);
  const collection = queryText(req.query.collection, 'collection', 140);
  const brand = queryText(req.query.brand, 'brand', 100);
  const compatibility = queryText(req.query.compatibility, 'compatibility', 100);
  const featuredValue = queryText(req.query.featured, 'featured', 5);
  if (featuredValue && !['true', 'false'].includes(featuredValue)) throw new AppError(400, 'featured must be true or false.');
  const featured = featuredValue === 'true';
  const sort = queryChoice(req.query.sort, 'sort', ['newest', 'price-asc', 'price-desc', 'name'], 'newest');
  const orderBy = sort === 'price-asc' ? { price: 'asc' }
    : sort === 'price-desc' ? { price: 'desc' }
      : sort === 'name' ? { name: 'asc' }
        : { createdAt: 'desc' };
  const where = {
    isActive: true,
    status: 'ACTIVE',
    ...(featured ? { isFeatured: true } : {}),
    ...(search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } },
        { tags: { has: search.toLowerCase() } },
        { compatibility: { has: search } },
      ],
    } : {}),
    ...(brand ? { brand: { equals: brand, mode: 'insensitive' } } : {}),
    ...(compatibility ? { compatibility: { has: compatibility } } : {}),
    ...(category ? {
      category: { is: { OR: [
        ...(isUuid(category) ? [{ id: category }] : []),
        { slug: category },
        { name: { equals: category, mode: 'insensitive' } },
      ] } },
    } : {}),
    ...(collection ? {
      collections: { some: { collection: { OR: [
        ...(isUuid(collection) ? [{ id: collection }] : []),
        { slug: collection },
      ] } } },
    } : {}),
  };
  const [products, total] = await prisma.$transaction([
    prisma.product.findMany({ where, include: productInclude, orderBy, skip, take: limit }),
    prisma.product.count({ where }),
  ]);
  res.json({
    products: products.map(publicProduct),
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  });
}));

app.get('/api/products/:idOrSlug', asyncRoute(async (req, res) => {
  const key = req.params.idOrSlug;
  const product = await prisma.product.findFirst({
    where: { isActive: true, status: 'ACTIVE', OR: [...(isUuid(key) ? [{ id: key }] : []), { slug: key }] },
    include: productInclude,
  });
  if (!product) throw new AppError(404, 'Product not found.');
  res.json({ product: publicProduct(product) });
}));

app.get('/api/products/:idOrSlug/reviews', asyncRoute(async (req, res) => {
  const key = req.params.idOrSlug;
  const product = await prisma.product.findFirst({
    where: { isActive: true, status: 'ACTIVE', OR: [...(isUuid(key) ? [{ id: key }] : []), { slug: key }] },
    select: { id: true },
  });
  if (!product) throw new AppError(404, 'Product not found.');
  const [reviews, aggregate] = await Promise.all([
    prisma.review.findMany({
      where: { productId: product.id, status: 'APPROVED' },
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
      take: 50,
    }),
    prisma.review.aggregate({
      where: { productId: product.id, status: 'APPROVED' },
      _count: { _all: true },
      _avg: { rating: true },
    }),
  ]);
  res.json({
    reviews: reviews.map(publicReview),
    summary: { count: aggregate._count._all, average: aggregate._avg.rating || 0 },
  });
}));

app.post('/api/products/:idOrSlug/reviews', optionalCustomer, asyncRoute(async (req, res) => {
  const body = validate(reviewSubmitSchema, req.body);
  const key = req.params.idOrSlug;
  const product = await prisma.product.findFirst({
    where: { isActive: true, status: 'ACTIVE', OR: [...(isUuid(key) ? [{ id: key }] : []), { slug: key }] },
    select: { id: true },
  });
  if (!product) throw new AppError(404, 'Product not found.');
  const reviewerEmail = body.reviewerEmail.trim().toLowerCase();
  const duplicate = await prisma.review.findFirst({
    where: { productId: product.id, reviewerEmail, status: { in: ['PENDING', 'APPROVED'] } },
    select: { id: true },
  });
  if (duplicate) throw new AppError(409, 'A review from this email is already awaiting moderation or published for this product.');

  let verifiedOrder = null;
  if (req.customer) {
    verifiedOrder = await prisma.order.findFirst({
      where: {
        userId: req.customer.id,
        status: { in: ['PAID', 'SHIPPED', 'DELIVERED'] },
        items: { some: { productId: product.id } },
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
  }
  const review = await prisma.review.create({
    data: {
      productId: product.id,
      userId: req.customer?.id || null,
      orderId: verifiedOrder?.id || null,
      reviewerName: body.reviewerName,
      reviewerEmail,
      rating: body.rating,
      title: body.title || null,
      body: body.body,
      status: 'PENDING',
      source: 'WEBSITE',
      isVerifiedPurchase: Boolean(verifiedOrder),
    },
  });
  res.status(201).json({ review: publicReview(review), message: 'Thanks. Your review was submitted for moderation.' });
}));

app.post('/api/discounts/validate', optionalCustomer, asyncRoute(async (req, res) => {
  const body = validate(discountValidateSchema, req.body);
  const result = await prisma.$transaction(async (tx) => {
    const { prepared, subtotal } = await prepareRequestedItems(tx, body.items, { checkStock: false });
    const freeShippingThreshold = decimalFromEnv('FREE_SHIPPING_THRESHOLD', 2500);
    const flatShippingRate = decimalFromEnv('FLAT_SHIPPING_RATE', 300);
    const shippingTotal = subtotal.greaterThanOrEqualTo(freeShippingThreshold) ? new Prisma.Decimal(0) : flatShippingRate;
    const evaluated = await evaluateDiscount(tx, {
      code: body.code,
      prepared,
      subtotal,
      shippingTotal,
      userId: req.customer?.id || null,
      guestEmail: req.customer ? null : body.customerEmail || null,
    });
    return {
      code: evaluated.discountCode,
      name: evaluated.discount.name,
      type: evaluated.discount.type,
      discountTotal: evaluated.discountTotal,
      subtotal,
      shippingTotal,
      total: subtotal.plus(shippingTotal).minus(evaluated.discountTotal),
    };
  });
  res.json({ discount: result });
}));

// Customer order creation: prices, discounts, delivery, payment method, and inventory are resolved only on the server.
app.post('/api/orders', optionalCustomer, asyncRoute(async (req, res) => {
  const body = validate(orderCreateSchema, req.body);
  const customerEmail = (req.customer?.email || body.customerEmail || '').trim().toLowerCase();
  if (!customerEmail) throw new AppError(400, 'Email is required to place an order as a guest.');
  let selectedMethod = null;
  let order = await prisma.$transaction(async (tx) => {
    selectedMethod = await getPaymentMethod(tx, body.paymentMethodCode);
    const { prepared, subtotal } = await prepareRequestedItems(tx, body.items);
    const stockMovements = await allocatePreparedInventory(tx, prepared, { reason: 'Inventory allocated to website order' });

    const freeShippingThreshold = decimalFromEnv('FREE_SHIPPING_THRESHOLD', 2500);
    const flatShippingRate = decimalFromEnv('FLAT_SHIPPING_RATE', 300);
    const shippingTotal = subtotal.greaterThanOrEqualTo(freeShippingThreshold)
      ? new Prisma.Decimal(0)
      : flatShippingRate;
    const discount = await evaluateDiscount(tx, {
      code: body.discountCode,
      prepared,
      subtotal,
      shippingTotal,
      userId: req.customer?.id || null,
      guestEmail: req.customer ? null : customerEmail,
      incrementUsage: Boolean(body.discountCode),
    });
    const taxTotal = new Prisma.Decimal(0);
    const total = Prisma.Decimal.max(subtotal.plus(shippingTotal).plus(taxTotal).minus(discount.discountTotal), 0);

    const protectedAddress = protectShippingAddress(body.shippingAddress);
    const created = await tx.order.create({
      data: {
        userId: req.customer?.id || null,
        customerEmail,
        customerPhone: body.shippingAddress.phone,
        source: 'WEBSITE',
        status: 'PENDING',
        paymentStatus: selectedMethod.requiresOnlinePayment ? 'PROCESSING' : 'UNPAID',
        paymentProvider: selectedMethod.provider,
        paymentMethodCode: selectedMethod.code,
        discountCode: discount.discountCode,
        discountTotal: discount.discountTotal,
        taxTotal,
        subtotal,
        shippingTotal,
        total,
        customerNote: body.customerNote || null,
        ...protectedAddress,
        items: {
          create: prepared.map(({ product, variant, requested, unitPrice }) => ({
            productId: product.id,
            variantId: variant?.id || null,
            productName: product.name,
            variantLabel: variant ? [variant.color, variant.size].filter(Boolean).join(' / ') : null,
            unitPrice,
            unitCost: variant?.costPrice ?? product.costPrice ?? null,
            quantity: requested.quantity,
          })),
        },
      },
      include: orderInclude,
    });

    for (const movement of stockMovements) {
      await createInventoryMovement(tx, { ...movement, reference: created.id });
    }
    return created;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  let checkoutUrl = null;
  if (selectedMethod.provider === 'safepay') {
    try {
      const storeUrl = storefrontBaseUrl();
      const payment = await createSafepayCheckout({
        amount: order.total,
        orderId: order.id,
        cancelUrl: `${storeUrl}/checkout/cancelled?order=${order.id}`,
        redirectUrl: `${storeUrl}/checkout/success?order=${order.id}`,
      });
      checkoutUrl = payment.checkoutUrl;
      order = await prisma.order.update({
        where: { id: order.id },
        data: { paymentReference: payment.tracker, paymentTracker: payment.tracker },
        include: orderInclude,
      });
    } catch (error) {
      await prisma.$transaction(async (tx) => {
        const failed = await tx.order.findUnique({ where: { id: order.id }, include: { items: true } });
        if (failed && failed.status === 'PENDING') {
          await restoreOrderInventory(tx, failed);
          await tx.order.update({
            where: { id: failed.id },
            data: { status: 'CANCELLED', paymentStatus: 'FAILED' },
          });
        }
      });
      throw error;
    }
  }

  await attemptSideEffect(emailEvents.orderPlaced(order, checkoutUrl));
  res.status(201).json({
    order: publicOrder(order),
    payment: {
      method: publicPaymentMethod(selectedMethod),
      checkoutUrl,
    },
  });
}));

app.get('/api/orders', requireCustomer, asyncRoute(async (req, res) => {
  const orders = await prisma.order.findMany({
    where: { userId: req.customer.id },
    include: orderInclude,
    orderBy: { createdAt: 'desc' },
  });
  res.json({ orders: orders.map(publicOrder) });
}));

// Admin authentication uses an independent opaque HttpOnly session cookie and a separate session table.
app.post('/api/admin/auth/login', asyncRoute(async (req, res) => {
  const body = validate(loginSchema, req.body);
  await verifyTurnstile(body.turnstileToken, req);
  const admin = await prisma.admin.findUnique({ where: { email: body.email } });
  if (!admin || !(await bcrypt.compare(body.password, admin.passwordHash))) {
    throw new AppError(401, 'Invalid admin email or password.');
  }
  const safeAdmin = { id: admin.id, name: admin.name, email: admin.email, role: admin.role, createdAt: admin.createdAt };
  const { csrfToken } = await createAdminSession(prisma, req, res, admin.id);
  res.json({
    admin: safeAdmin,
    csrfToken,
    ...(legacyBearerEnabled() ? { token: signAdminToken(admin.id, admin.role) } : {}),
  });
}));

app.get('/api/admin/me', requireAdmin, asyncRoute(async (req, res) => {
  const csrfToken = req.adminSession
    ? await rotateAdminCsrf(prisma, req.adminSession.id)
    : null;
  res.json({ admin: req.admin, csrfToken });
}));

app.post('/api/admin/auth/logout', requireAdmin, asyncRoute(async (req, res) => {
  await revokeAdminSession(prisma, req, res);
  res.status(204).send();
}));

app.get('/api/admin/admins', requireAdmin, requireSuperadmin, asyncRoute(async (_req, res) => {
  const admins = await prisma.admin.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
  res.json({ admins });
}));

app.post('/api/admin/admins', requireAdmin, requireSuperadmin, asyncRoute(async (req, res) => {
  const body = validate(adminCreateSchema, req.body);
  const exists = await prisma.admin.findUnique({ where: { email: body.email }, select: { id: true } });
  if (exists) throw new AppError(409, 'An admin account with this email already exists.');
  const admin = await prisma.admin.create({
    data: {
      name: body.name || null,
      email: body.email,
      role: body.role,
      passwordHash: await bcrypt.hash(body.password, 12),
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
  res.status(201).json({ admin });
}));

// Signed direct uploads keep Cloudinary secrets on the backend while files upload from the browser.
app.post('/api/admin/uploads/signature', requireAdmin, asyncRoute(async (_req, res) => {
  res.json(createUploadSignature());
}));

app.get('/api/admin/media', requireAdmin, asyncRoute(async (_req, res) => {
  const assets = await prisma.mediaAsset.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
  res.json({ assets });
}));

app.post('/api/admin/media', requireAdmin, asyncRoute(async (req, res) => {
  const body = validate(mediaCreateSchema, req.body);
  const verified = await verifyUploadedAsset(body.publicId);
  if (verified.secureUrl !== body.secureUrl) throw new AppError(400, 'Uploaded image metadata did not match Cloudinary.');
  const asset = await prisma.mediaAsset.upsert({
    where: { publicId: verified.publicId },
    update: {
      secureUrl: verified.secureUrl,
      format: verified.format,
      width: verified.width,
      height: verified.height,
      bytes: verified.bytes,
      createdByAdminId: req.admin.id,
    },
    create: {
      publicId: verified.publicId,
      secureUrl: verified.secureUrl,
      format: verified.format,
      width: verified.width,
      height: verified.height,
      bytes: verified.bytes,
      createdByAdminId: req.admin.id,
    },
  });
  res.status(201).json({ asset });
}));

app.delete('/api/admin/media/:id', requireAdmin, asyncRoute(async (req, res) => {
  const asset = await prisma.mediaAsset.findUnique({ where: { id: req.params.id } });
  if (!asset) throw new AppError(404, 'Media asset not found.');
  const referenced = await prisma.product.findFirst({
    where: {
      OR: [
        { images: { has: asset.secureUrl } },
        { variants: { some: { image: asset.secureUrl } } },
      ],
    },
    select: { id: true, name: true },
  });
  if (referenced) {
    throw new AppError(409, `Remove this image from ${referenced.name} before deleting it.`);
  }
  await destroyAsset(asset.publicId);
  await prisma.mediaAsset.delete({ where: { id: asset.id } });
  res.status(204).send();
}));

app.get('/api/admin/dashboard', requireAdmin, asyncRoute(async (req, res) => {
  const [productCount, activeProducts, inventoryRows, collectionCount, activeDiscounts, orderCount, recentMovements, finance] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { status: 'ACTIVE', isActive: true } }),
    prisma.product.findMany({ where: { status: { not: 'ARCHIVED' } }, select: { stock: true, lowStockThreshold: true, variants: { select: { stock: true, lowStockThreshold: true } } } }),
    prisma.collection.count(),
    prisma.discount.count({ where: { isActive: true } }),
    prisma.order.count(),
    prisma.inventoryMovement.findMany({
      take: 8,
      orderBy: { createdAt: 'desc' },
      include: { product: { select: { id: true, name: true } }, variant: { select: { id: true, sku: true, size: true, color: true } }, admin: { select: { name: true, email: true } } },
    }),
    buildFinanceDashboard(typeof req.query.range === 'string' ? req.query.range : '30d'),
  ]);
  const inventoryState = (item) => {
    if (item.variants.length) {
      const out = item.variants.every((variant) => variant.stock === 0);
      const low = item.variants.some((variant) => variant.stock > 0 && variant.stock <= variant.lowStockThreshold);
      return { out, low };
    }
    return { out: item.stock === 0, low: item.stock > 0 && item.stock <= item.lowStockThreshold };
  };
  const lowStockProducts = inventoryRows.filter((item) => inventoryState(item).low).length;
  const outOfStockProducts = inventoryRows.filter((item) => inventoryState(item).out).length;
  res.json({
    metrics: {
      productCount,
      activeProducts,
      lowStockProducts,
      outOfStockProducts,
      collectionCount,
      activeDiscounts,
      orderCount,
      revenue: finance.totalRevenue,
    },
    finance,
    recentMovements,
  });
}));

app.get('/api/admin/storefront', requireAdmin, asyncRoute(async (_req, res) => {
  const settings = await prisma.storefrontSettings.findUnique({ where: { id: 'primary' } });
  res.json({ settings: publicStorefrontSettings(settings) });
}));

app.put('/api/admin/storefront', requireAdmin, asyncRoute(async (req, res) => {
  const body = validate(storefrontSettingsSchema, req.body);
  const settings = await prisma.storefrontSettings.upsert({
    where: { id: 'primary' },
    create: { id: 'primary', ...body, updatedByAdminId: req.admin.id },
    update: { ...body, updatedByAdminId: req.admin.id },
  });
  res.json({ settings: publicStorefrontSettings(settings) });
}));

app.get('/api/admin/content-pages', requireAdmin, asyncRoute(async (_req, res) => {
  const pages = await prisma.contentPage.findMany({ orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }] });
  res.json({ pages });
}));

app.post('/api/admin/content-pages', requireAdmin, asyncRoute(async (req, res) => {
  const body = validate(contentPageCreateSchema, req.body);
  const page = await prisma.contentPage.create({
    data: { ...body, slug: await uniqueSlugFor('contentPage', body.title, body.slug), heroImage: body.heroImage || null, sections: body.sections || [], updatedByAdminId: req.admin.id },
  });
  res.status(201).json({ page });
}));

async function updateContentPage(req, res) {
  const body = validate(contentPageUpdateSchema, req.body);
  const current = await prisma.contentPage.findUnique({ where: { id: req.params.id } });
  if (!current) throw new AppError(404, 'Content page not found.');
  const page = await prisma.contentPage.update({
    where: { id: current.id },
    data: {
      ...body,
      ...(body.title || body.slug ? { slug: await uniqueSlugFor('contentPage', body.title || current.title, body.slug || current.slug, current.id) } : {}),
      ...(Object.prototype.hasOwnProperty.call(body, 'heroImage') ? { heroImage: body.heroImage || null } : {}),
      ...(Object.prototype.hasOwnProperty.call(body, 'sections') ? { sections: body.sections || [] } : {}),
      updatedByAdminId: req.admin.id,
    },
  });
  res.json({ page });
}
app.put('/api/admin/content-pages/:id', requireAdmin, asyncRoute(updateContentPage));
app.patch('/api/admin/content-pages/:id', requireAdmin, asyncRoute(updateContentPage));
app.delete('/api/admin/content-pages/:id', requireAdmin, requireSuperadmin, asyncRoute(async (req, res) => {
  await prisma.contentPage.delete({ where: { id: req.params.id } });
  res.status(204).send();
}));

app.get('/api/admin/categories', requireAdmin, asyncRoute(async (_req, res) => {
  const rows = await prisma.category.findMany({
    include: { _count: { select: { products: true, children: true } }, parent: { select: { id: true, name: true } } },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
  res.json({ categories: rows.map(({ _count, ...category }) => ({ ...category, productCount: _count.products, childCount: _count.children })) });
}));

app.post('/api/admin/categories', requireAdmin, asyncRoute(async (req, res) => {
  const body = validate(categoryCreateSchema, req.body);
  await assertValidCategoryParent(null, body.parentId);
  const category = await prisma.category.create({
    data: { ...body, slug: await uniqueCategorySlug(body.name, body.slug), image: body.image || null, parentId: body.parentId || null },
  });
  res.status(201).json({ category });
}));

async function updateCategory(req, res) {
  const body = validate(categoryUpdateSchema, req.body);
  const current = await prisma.category.findUnique({ where: { id: req.params.id } });
  if (!current) throw new AppError(404, 'Category not found.');
  if (Object.prototype.hasOwnProperty.call(body, 'parentId')) await assertValidCategoryParent(current.id, body.parentId);
  const category = await prisma.category.update({
    where: { id: current.id },
    data: {
      ...body,
      ...(body.name || body.slug ? { slug: await uniqueCategorySlug(body.name || current.name, body.slug || current.slug, current.id) } : {}),
      ...(Object.prototype.hasOwnProperty.call(body, 'image') ? { image: body.image || null } : {}),
      ...(Object.prototype.hasOwnProperty.call(body, 'parentId') ? { parentId: body.parentId || null } : {}),
    },
  });
  res.json({ category });
}
app.put('/api/admin/categories/:id', requireAdmin, asyncRoute(updateCategory));
app.patch('/api/admin/categories/:id', requireAdmin, asyncRoute(updateCategory));

app.delete('/api/admin/categories/:id', requireAdmin, asyncRoute(async (req, res) => {
  await prisma.$transaction([
    prisma.product.updateMany({ where: { categoryId: req.params.id }, data: { categoryId: null } }),
    prisma.category.updateMany({ where: { parentId: req.params.id }, data: { parentId: null } }),
    prisma.category.delete({ where: { id: req.params.id } }),
  ]);
  res.status(204).send();
}));

app.get('/api/admin/collections', requireAdmin, asyncRoute(async (_req, res) => {
  const rows = await prisma.collection.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
  res.json({ collections: rows.map(({ _count, ...collection }) => ({ ...collection, productCount: _count.products })) });
}));

app.post('/api/admin/collections', requireAdmin, asyncRoute(async (req, res) => {
  const body = validate(collectionCreateSchema, req.body);
  const { productIds, ...fields } = body;
  const collection = await prisma.collection.create({
    data: {
      ...fields,
      image: fields.image || null,
      slug: await uniqueCollectionSlug(fields.name, fields.slug),
      products: { create: productIds.map((productId, position) => ({ productId, position })) },
    },
    include: { _count: { select: { products: true } } },
  });
  res.status(201).json({ collection: { ...collection, productCount: collection._count.products } });
}));

async function updateCollection(req, res) {
  const body = validate(collectionUpdateSchema, req.body);
  const current = await prisma.collection.findUnique({ where: { id: req.params.id } });
  if (!current) throw new AppError(404, 'Collection not found.');
  const { productIds, ...fields } = body;
  const collection = await prisma.$transaction(async (tx) => {
    if (productIds) {
      await tx.collectionProduct.deleteMany({ where: { collectionId: current.id } });
      if (productIds.length) {
        await tx.collectionProduct.createMany({ data: productIds.map((productId, position) => ({ collectionId: current.id, productId, position })) });
      }
    }
    return tx.collection.update({
      where: { id: current.id },
      data: {
        ...fields,
        ...(fields.name || fields.slug ? { slug: await uniqueCollectionSlug(fields.name || current.name, fields.slug || current.slug, current.id) } : {}),
        ...(Object.prototype.hasOwnProperty.call(fields, 'image') ? { image: fields.image || null } : {}),
      },
      include: { _count: { select: { products: true } } },
    });
  });
  res.json({ collection: { ...collection, productCount: collection._count.products } });
}
app.put('/api/admin/collections/:id', requireAdmin, asyncRoute(updateCollection));
app.patch('/api/admin/collections/:id', requireAdmin, asyncRoute(updateCollection));
app.delete('/api/admin/collections/:id', requireAdmin, asyncRoute(async (req, res) => {
  await prisma.collection.delete({ where: { id: req.params.id } });
  res.status(204).send();
}));

app.get('/api/admin/products', requireAdmin, asyncRoute(async (req, res) => {
  const { page, limit, skip } = parsePagination({ ...req.query, limit: req.query.limit || '500' }, 1000);
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const status = typeof req.query.status === 'string' ? req.query.status : '';
  const categoryId = typeof req.query.categoryId === 'string' ? req.query.categoryId : '';
  const stock = typeof req.query.stock === 'string' ? req.query.stock : '';
  const where = {
    ...(status && ['DRAFT', 'ACTIVE', 'ARCHIVED'].includes(status) ? { status } : {}),
    ...(categoryId && isUuid(categoryId) ? { categoryId } : {}),
    ...(stock === 'low' ? { stock: { gt: 0, lte: 5 } } : stock === 'out' ? { stock: 0 } : {}),
    ...(search ? { OR: [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { brand: { contains: search, mode: 'insensitive' } },
      { model: { contains: search, mode: 'insensitive' } },
      { barcode: { contains: search, mode: 'insensitive' } },
      { variants: { some: { sku: { contains: search, mode: 'insensitive' } } } },
    ] } : {}),
  };
  const [products, total] = await prisma.$transaction([
    prisma.product.findMany({ where, include: productInclude, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.product.count({ where }),
  ]);
  const enrichedProducts = await enrichProductsWithSales(products);
  res.json({ products: enrichedProducts, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } });
}));

app.post('/api/admin/products', requireAdmin, asyncRoute(async (req, res) => {
  const body = validate(productCreateSchema, req.body);
  const slug = await uniqueProductSlug(body.name, body.slug);
  const variantStock = body.variants?.reduce((sum, variant) => sum + variant.stock, 0);
  const { variants = [], collectionIds = [] } = body;
  const product = await prisma.$transaction(async (tx) => {
    const created = await tx.product.create({
      data: {
        ...cleanProductData({ ...body, stock: variants.length ? variantStock : body.stock }, slug),
        ...(variants.length ? {
          variants: {
            create: variants.map(({ id: _id, price, costPrice, image, ...variant }) => ({
              ...variant,
              image: image || null,
              price: price == null ? null : new Prisma.Decimal(price),
              costPrice: costPrice == null ? null : new Prisma.Decimal(costPrice),
            })),
          },
        } : {}),
        ...(collectionIds.length ? { collections: { create: collectionIds.map((collectionId, position) => ({ collectionId, position })) } } : {}),
      },
      include: productInclude,
    });
    if (created.stock > 0) {
      await createInventoryMovement(tx, { productId: created.id, adminId: req.admin.id, type: 'INITIAL', quantityChange: created.stock, stockAfter: created.stock, reason: 'Initial product inventory' });
    }
    for (const variant of created.variants) {
      if (variant.stock > 0) await createInventoryMovement(tx, { productId: created.id, variantId: variant.id, adminId: req.admin.id, type: 'INITIAL', quantityChange: variant.stock, stockAfter: variant.stock, reason: 'Initial variant inventory' });
    }
    return created;
  });
  res.status(201).json({ product });
}));

async function updateProduct(req, res) {
  const body = validate(productUpdateSchema, req.body);
  const current = await prisma.product.findUnique({ where: { id: req.params.id }, include: { variants: true, collections: true } });
  if (!current) throw new AppError(404, 'Product not found.');
  const slug = body.name || body.slug ? await uniqueProductSlug(body.name || current.name, body.slug || current.slug, current.id) : current.slug;
  const { variants, collectionIds, ...withoutVariants } = body;
  const field = (name, fallback) => Object.prototype.hasOwnProperty.call(withoutVariants, name) ? withoutVariants[name] : fallback;
  const data = cleanProductData({
    name: field('name', current.name),
    description: field('description', current.description),
    price: field('price', Number(current.price)),
    compareAtPrice: field('compareAtPrice', current.compareAtPrice == null ? null : Number(current.compareAtPrice)),
    costPrice: field('costPrice', current.costPrice == null ? null : Number(current.costPrice)),
    stock: field('stock', current.stock),
    lowStockThreshold: field('lowStockThreshold', current.lowStockThreshold),
    images: field('images', current.images),
    isActive: field('isActive', current.isActive),
    status: field('status', current.status),
    isFeatured: field('isFeatured', current.isFeatured),
    categoryId: field('categoryId', current.categoryId),
    brand: field('brand', current.brand),
    model: field('model', current.model),
    barcode: field('barcode', current.barcode),
    condition: field('condition', current.condition),
    warrantyMonths: field('warrantyMonths', current.warrantyMonths),
    compatibility: field('compatibility', current.compatibility),
    specifications: field('specifications', current.specifications || {}),
    highlights: field('highlights', current.highlights),
    whatsInBox: field('whatsInBox', current.whatsInBox),
    seoTitle: field('seoTitle', current.seoTitle),
    seoDescription: field('seoDescription', current.seoDescription),
    color: field('color', current.color),
    material: field('material', current.material),
    careInstructions: field('careInstructions', current.careInstructions),
    tags: field('tags', current.tags),
  }, slug);

  const product = await prisma.$transaction(async (tx) => {
    if (collectionIds) {
      await tx.collectionProduct.deleteMany({ where: { productId: current.id } });
      if (collectionIds.length) await tx.collectionProduct.createMany({ data: collectionIds.map((collectionId, position) => ({ productId: current.id, collectionId, position })) });
    }
    if (variants) {
      const existingIds = new Set(current.variants.map((variant) => variant.id));
      const providedIds = new Set(variants.flatMap((variant) => variant.id ? [variant.id] : []));
      for (const id of providedIds) if (!existingIds.has(id)) throw new AppError(400, 'A supplied variant does not belong to this product.');

      const omittedIds = current.variants.map((variant) => variant.id).filter((id) => !providedIds.has(id));
      if (omittedIds.length) {
        const referenced = await tx.orderItem.findMany({ where: { variantId: { in: omittedIds } }, select: { variantId: true }, distinct: ['variantId'] });
        const referencedIds = new Set(referenced.map((item) => item.variantId).filter(Boolean));
        const deletableIds = omittedIds.filter((id) => !referencedIds.has(id));
        const retainedIds = omittedIds.filter((id) => referencedIds.has(id));
        if (deletableIds.length) await tx.productVariant.deleteMany({ where: { id: { in: deletableIds } } });
        if (retainedIds.length) await tx.productVariant.updateMany({ where: { id: { in: retainedIds } }, data: { stock: 0 } });
      }

      for (const variant of variants) {
        const variantData = {
          sku: variant.sku,
          size: variant.size || null,
          color: variant.color || null,
          price: variant.price == null ? null : new Prisma.Decimal(variant.price),
          costPrice: variant.costPrice == null ? null : new Prisma.Decimal(variant.costPrice),
          stock: variant.stock,
          lowStockThreshold: variant.lowStockThreshold,
          barcode: variant.barcode || null,
          compatibility: variant.compatibility || [],
          specifications: variant.specifications || {},
          image: variant.image || null,
        };
        if (variant.id) {
          const before = current.variants.find((item) => item.id === variant.id);
          await tx.productVariant.update({ where: { id: variant.id }, data: variantData });
          const change = variant.stock - before.stock;
          if (change !== 0) await createInventoryMovement(tx, { productId: current.id, variantId: variant.id, adminId: req.admin.id, type: 'ADJUSTMENT', quantityChange: change, stockAfter: variant.stock, reason: 'Stock changed from product editor' });
        } else {
          const createdVariant = await tx.productVariant.create({ data: { ...variantData, productId: current.id } });
          if (createdVariant.stock > 0) await createInventoryMovement(tx, { productId: current.id, variantId: createdVariant.id, adminId: req.admin.id, type: 'INITIAL', quantityChange: createdVariant.stock, stockAfter: createdVariant.stock, reason: 'New variant inventory' });
        }
      }
      if (variants.length) data.stock = variants.reduce((sum, variant) => sum + variant.stock, 0);
    }
    const stockChange = Number(data.stock) - current.stock;
    const updated = await tx.product.update({ where: { id: current.id }, data, include: productInclude });
    if (stockChange !== 0) await createInventoryMovement(tx, { productId: current.id, adminId: req.admin.id, type: 'ADJUSTMENT', quantityChange: stockChange, stockAfter: updated.stock, reason: 'Aggregate stock changed from product editor' });
    return updated;
  });
  res.json({ product });
}

app.put('/api/admin/products/:id', requireAdmin, asyncRoute(updateProduct));
app.patch('/api/admin/products/:id', requireAdmin, asyncRoute(updateProduct));
app.delete('/api/admin/products/:id/permanent', requireAdmin, requireSuperadmin, asyncRoute(async (req, res) => {
  const referenced = await prisma.orderItem.findFirst({ where: { productId: req.params.id }, select: { id: true } });
  if (referenced) throw new AppError(409, 'Delete the related orders first, or archive this product to preserve sales history.');
  await prisma.product.delete({ where: { id: req.params.id } });
  res.status(204).send();
}));

app.delete('/api/admin/products/:id', requireAdmin, asyncRoute(async (req, res) => {
  const product = await prisma.product.update({ where: { id: req.params.id }, data: { isActive: false, status: 'ARCHIVED' }, include: productInclude });
  res.json({ product });
}));

app.post('/api/admin/products/bulk', requireAdmin, asyncRoute(async (req, res) => {
  const body = validate(productBulkActionSchema, req.body);
  const where = { id: { in: body.productIds } };
  if (body.action === 'ACTIVATE') await prisma.product.updateMany({ where, data: { isActive: true, status: 'ACTIVE' } });
  if (body.action === 'DEACTIVATE') await prisma.product.updateMany({ where, data: { isActive: false, status: 'DRAFT' } });
  if (body.action === 'ARCHIVE') await prisma.product.updateMany({ where, data: { isActive: false, status: 'ARCHIVED' } });
  if (body.action === 'FEATURE') await prisma.product.updateMany({ where, data: { isFeatured: true } });
  if (body.action === 'UNFEATURE') await prisma.product.updateMany({ where, data: { isFeatured: false } });
  if (body.action === 'MOVE_CATEGORY') {
    if (!Object.prototype.hasOwnProperty.call(body, 'categoryId')) throw new AppError(400, 'Choose a category.');
    await prisma.product.updateMany({ where, data: { categoryId: body.categoryId || null } });
  }
  if (body.action === 'SET_LOW_STOCK') {
    if (body.lowStockThreshold == null) throw new AppError(400, 'Enter a low-stock threshold.');
    await prisma.product.updateMany({ where, data: { lowStockThreshold: body.lowStockThreshold } });
  }
  if (body.action === 'ADD_COLLECTION' || body.action === 'REMOVE_COLLECTION') {
    if (!body.collectionId) throw new AppError(400, 'Choose a collection.');
    if (body.action === 'ADD_COLLECTION') {
      await prisma.collectionProduct.createMany({ data: body.productIds.map((productId) => ({ productId, collectionId: body.collectionId })), skipDuplicates: true });
    } else {
      await prisma.collectionProduct.deleteMany({ where: { productId: { in: body.productIds }, collectionId: body.collectionId } });
    }
  }
  if (body.action === 'DELETE') {
    if (req.admin.role !== 'SUPERADMIN') throw new AppError(403, 'Only a superadmin can permanently delete products.');
    const referenced = await prisma.orderItem.findFirst({ where: { productId: { in: body.productIds } }, select: { productId: true } });
    if (referenced) throw new AppError(409, 'Products used in orders cannot be permanently deleted. Archive them instead.');
    await prisma.product.deleteMany({ where });
  }
  const products = await prisma.product.findMany({ where, include: productInclude, orderBy: { createdAt: 'desc' } });
  res.json({ products, affected: body.productIds.length, action: body.action });
}));

app.get('/api/admin/inventory', requireAdmin, asyncRoute(async (req, res) => {
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const filter = typeof req.query.filter === 'string' ? req.query.filter : 'all';
  const rows = await prisma.product.findMany({
    where: {
      status: { not: 'ARCHIVED' },
      ...(search ? { OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } },
        { variants: { some: { sku: { contains: search, mode: 'insensitive' } } } },
      ] } : {}),
    },
    include: productInclude,
    orderBy: [{ stock: 'asc' }, { name: 'asc' }],
  });
  const products = rows.filter((product) => {
    const variants = product.variants || [];
    const isOut = variants.length ? variants.every((variant) => variant.stock === 0) : product.stock === 0;
    const isLow = variants.length
      ? variants.some((variant) => variant.stock > 0 && variant.stock <= variant.lowStockThreshold)
      : product.stock > 0 && product.stock <= product.lowStockThreshold;
    return filter === 'all' || (filter === 'low' && isLow) || (filter === 'out' && isOut);
  });
  res.json({ products });
}));

app.get('/api/admin/inventory/movements', requireAdmin, asyncRoute(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const productId = typeof req.query.productId === 'string' && isUuid(req.query.productId) ? req.query.productId : undefined;
  const [movements, total] = await prisma.$transaction([
    prisma.inventoryMovement.findMany({
      where: productId ? { productId } : {},
      include: { product: { select: { id: true, name: true, images: true } }, variant: { select: { id: true, sku: true, size: true, color: true } }, admin: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' }, skip, take: limit,
    }),
    prisma.inventoryMovement.count({ where: productId ? { productId } : {} }),
  ]);
  res.json({ movements, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } });
}));

app.post('/api/admin/inventory/adjust', requireAdmin, asyncRoute(async (req, res) => {
  const body = validate(inventoryAdjustmentSchema, req.body);
  const product = await prisma.product.findUnique({ where: { id: body.productId }, include: { variants: true } });
  if (!product) throw new AppError(404, 'Product not found.');
  if (product.variants.length && !body.variantId) throw new AppError(400, 'Choose a product configuration before adjusting inventory.');
  if (body.variantId && !product.variants.some((variant) => variant.id === body.variantId)) throw new AppError(400, 'The selected configuration does not belong to this product.');

  const updated = await prisma.$transaction(async (tx) => {
    let variant = null;
    if (body.variantId) {
      const currentVariant = product.variants.find((item) => item.id === body.variantId);
      const nextVariantStock = currentVariant.stock + body.quantityChange;
      if (nextVariantStock < 0) throw new AppError(409, 'This adjustment would make variant inventory negative.');
      variant = await tx.productVariant.update({ where: { id: body.variantId }, data: { stock: nextVariantStock } });
      await createInventoryMovement(tx, { ...body, adminId: req.admin.id, stockAfter: variant.stock });
    }
    const nextProductStock = product.stock + body.quantityChange;
    if (nextProductStock < 0) throw new AppError(409, 'This adjustment would make product inventory negative.');
    const updatedProduct = await tx.product.update({ where: { id: product.id }, data: { stock: nextProductStock }, include: productInclude });
    await createInventoryMovement(tx, { ...body, variantId: null, adminId: req.admin.id, stockAfter: updatedProduct.stock });
    return { product: updatedProduct, variant };
  });
  res.json(updated);
}));

app.get('/api/admin/discounts', requireAdmin, asyncRoute(async (_req, res) => {
  const discounts = await prisma.discount.findMany({ orderBy: { createdAt: 'desc' } });
  res.json({ discounts });
}));
app.post('/api/admin/discounts', requireAdmin, asyncRoute(async (req, res) => {
  const body = validate(discountCreateSchema, req.body);
  assertDiscountTargeting(body);
  const discount = await prisma.discount.create({ data: {
    ...body,
    value: new Prisma.Decimal(body.value),
    minimumOrderAmount: body.minimumOrderAmount == null ? null : new Prisma.Decimal(body.minimumOrderAmount),
    maximumDiscountAmount: body.maximumDiscountAmount == null ? null : new Prisma.Decimal(body.maximumDiscountAmount),
    startsAt: body.startsAt ? new Date(body.startsAt) : null,
    endsAt: body.endsAt ? new Date(body.endsAt) : null,
  } });
  res.status(201).json({ discount });
}));
async function updateDiscount(req, res) {
  const body = validate(discountUpdateSchema, req.body);
  const current = await prisma.discount.findUnique({ where: { id: req.params.id } });
  if (!current) throw new AppError(404, 'Discount not found.');
  const merged = { ...current, ...body };
  assertDiscountTargeting(merged);
  if (merged.startsAt && merged.endsAt && new Date(merged.endsAt) <= new Date(merged.startsAt)) {
    throw new AppError(400, 'Discount end date must be after the start date.');
  }
  const discount = await prisma.discount.update({ where: { id: current.id }, data: {
    ...body,
    ...(Object.prototype.hasOwnProperty.call(body, 'value') ? { value: new Prisma.Decimal(body.value) } : {}),
    ...(Object.prototype.hasOwnProperty.call(body, 'minimumOrderAmount') ? { minimumOrderAmount: body.minimumOrderAmount == null ? null : new Prisma.Decimal(body.minimumOrderAmount) } : {}),
    ...(Object.prototype.hasOwnProperty.call(body, 'maximumDiscountAmount') ? { maximumDiscountAmount: body.maximumDiscountAmount == null ? null : new Prisma.Decimal(body.maximumDiscountAmount) } : {}),
    ...(Object.prototype.hasOwnProperty.call(body, 'startsAt') ? { startsAt: body.startsAt ? new Date(body.startsAt) : null } : {}),
    ...(Object.prototype.hasOwnProperty.call(body, 'endsAt') ? { endsAt: body.endsAt ? new Date(body.endsAt) : null } : {}),
  } });
  res.json({ discount });
}
app.put('/api/admin/discounts/:id', requireAdmin, asyncRoute(updateDiscount));
app.patch('/api/admin/discounts/:id', requireAdmin, asyncRoute(updateDiscount));
app.delete('/api/admin/discounts/:id', requireAdmin, asyncRoute(async (req, res) => {
  const discount = await prisma.discount.update({ where: { id: req.params.id }, data: { isActive: false } });
  res.json({ discount });
}));

app.get('/api/admin/payment-methods', requireAdmin, asyncRoute(async (_req, res) => {
  const paymentMethods = await prisma.paymentMethod.findMany({ orderBy: [{ sortOrder: 'asc' }, { displayName: 'asc' }] });
  res.json({ paymentMethods: paymentMethods.map((method) => ({ ...method, environmentReady: paymentProviderReady(method) })) });
}));
app.post('/api/admin/payment-methods', requireAdmin, requireSuperadmin, asyncRoute(async (req, res) => {
  const body = validate(paymentMethodCreateSchema, req.body);
  const paymentMethod = await prisma.paymentMethod.create({ data: body });
  res.status(201).json({ paymentMethod });
}));
async function updatePaymentMethod(req, res) {
  const body = validate(paymentMethodUpdateSchema, req.body);
  const paymentMethod = await prisma.paymentMethod.update({ where: { id: req.params.id }, data: body });
  res.json({ paymentMethod });
}
app.put('/api/admin/payment-methods/:id', requireAdmin, requireSuperadmin, asyncRoute(updatePaymentMethod));
app.patch('/api/admin/payment-methods/:id', requireAdmin, requireSuperadmin, asyncRoute(updatePaymentMethod));

app.post('/api/admin/orders/manual', requireAdmin, asyncRoute(async (req, res) => {
  const body = validate(manualOrderCreateSchema, req.body);
  const order = await prisma.$transaction(async (tx) => {
    const preparedResult = await prepareRequestedItems(tx, body.items);
    const prepared = preparedResult.prepared.map((item) => ({
      ...item,
      unitPrice: item.requested.unitPrice == null ? item.unitPrice : new Prisma.Decimal(item.requested.unitPrice),
    }));
    const subtotal = prepared.reduce((sum, item) => sum.plus(item.unitPrice.mul(item.requested.quantity)), new Prisma.Decimal(0));
    const stockMovements = await allocatePreparedInventory(tx, prepared, {
      adminId: req.admin.id,
      reason: `Inventory allocated to ${body.source.toLowerCase().replaceAll('_', ' ')} order`,
    });
    const shippingTotal = new Prisma.Decimal(body.shippingTotal);
    const discountTotal = new Prisma.Decimal(body.discountTotal);
    const taxTotal = new Prisma.Decimal(body.taxTotal);
    const total = Prisma.Decimal.max(subtotal.plus(shippingTotal).plus(taxTotal).minus(discountTotal), 0);
    const now = new Date();
    const status = body.markDelivered ? 'DELIVERED' : body.paymentStatus === 'PAID' ? 'PAID' : 'PENDING';
    const protectedAddress = protectShippingAddress({
      ...body.shippingAddress,
      fullName: body.shippingAddress.fullName || body.customerName,
      phone: body.shippingAddress.phone || body.customerPhone || '',
    });
    const created = await tx.order.create({
      data: {
        userId: null,
        customerEmail: body.customerEmail || null,
        customerPhone: body.customerPhone || body.shippingAddress.phone || null,
        source: body.source,
        sourceNote: body.sourceNote || null,
        createdByAdminId: req.admin.id,
        status,
        paymentStatus: body.paymentStatus,
        paymentProvider: 'manual',
        paymentMethodCode: body.paymentMethodCode,
        discountTotal,
        taxTotal,
        subtotal,
        shippingTotal,
        total,
        customerNote: body.customerNote || null,
        paidAt: body.paymentStatus === 'PAID' ? now : null,
        deliveredAt: body.markDelivered ? now : null,
        ...protectedAddress,
        items: {
          create: prepared.map(({ product, variant, requested, unitPrice }) => ({
            productId: product.id,
            variantId: variant?.id || null,
            productName: product.name,
            variantLabel: variant ? [variant.color, variant.size].filter(Boolean).join(' / ') : null,
            unitPrice,
            unitCost: variant?.costPrice ?? product.costPrice ?? null,
            quantity: requested.quantity,
          })),
        },
      },
      include: orderInclude,
    });
    for (const movement of stockMovements) {
      await createInventoryMovement(tx, { ...movement, reference: created.id });
    }
    return created;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  if (body.sendConfirmation && order.customerEmail) await attemptSideEffect(emailEvents.orderPlaced(order, null));
  res.status(201).json({ order: adminOrder(order) });
}));

app.get('/api/admin/orders/export.csv', requireAdmin, asyncRoute(async (req, res) => {
  const status = queryChoice(req.query.status, 'status', ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'], '');
  const source = queryChoice(req.query.source, 'source', ['WEBSITE', 'MANUAL', 'PHONE', 'WHATSAPP', 'INSTAGRAM', 'FACEBOOK', 'WALK_IN', 'MARKETPLACE', 'OTHER'], '');
  const orders = await prisma.order.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(source ? { source } : {}),
    },
    include: orderInclude,
    orderBy: { createdAt: 'desc' },
  });
  const csv = orderExportRows(orders);
  const filename = `cosmic-tech-orders-${new Date().toISOString().slice(0, 10)}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(`\uFEFF${csv}`);
}));

app.get('/api/admin/orders', requireAdmin, asyncRoute(async (req, res) => {
  const status = queryChoice(req.query.status, 'status', ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'], '');
  const source = queryChoice(req.query.source, 'source', ['WEBSITE', 'MANUAL', 'PHONE', 'WHATSAPP', 'INSTAGRAM', 'FACEBOOK', 'WALK_IN', 'MARKETPLACE', 'OTHER'], '');
  const orders = await prisma.order.findMany({
    where: { ...(status ? { status } : {}), ...(source ? { source } : {}) },
    include: orderInclude,
    orderBy: { createdAt: 'desc' },
  });
  res.json({ orders: orders.map(adminOrder) });
}));

app.get('/api/admin/orders/deleted', requireAdmin, requireSuperadmin, asyncRoute(async (_req, res) => {
  const deletions = await prisma.orderDeletionLog.findMany({
    take: 100,
    orderBy: { deletedAt: 'desc' },
    include: { deletedBy: { select: { name: true, email: true } } },
  });
  res.json({ deletions });
}));

app.get('/api/admin/orders/:id', requireAdmin, asyncRoute(async (req, res) => {
  const order = await prisma.order.findUnique({ where: { id: req.params.id }, include: orderInclude });
  if (!order) throw new AppError(404, 'Order not found.');
  res.json({ order: adminOrder(order) });
}));

app.delete('/api/admin/orders/:id', requireAdmin, requireSuperadmin, asyncRoute(async (req, res) => {
  const body = validate(orderDeleteSchema, req.body);
  const current = await prisma.order.findUnique({ where: { id: req.params.id }, include: orderInclude });
  if (!current) throw new AppError(404, 'Order not found.');
  const shouldRestoreInventory = ['PENDING', 'PAID'].includes(current.status);
  await prisma.$transaction(async (tx) => {
    if (shouldRestoreInventory) await restoreOrderInventory(tx, current);
    await tx.orderDeletionLog.create({
      data: {
        orderId: current.id,
        reason: body.reason,
        snapshot: JSON.parse(JSON.stringify(current)),
        deletedByAdminId: req.admin.id,
      },
    });
    await tx.order.delete({ where: { id: current.id } });
  });
  res.status(204).send();
}));

app.patch('/api/admin/orders/:id/payment', requireAdmin, asyncRoute(async (req, res) => {
  const body = validate(manualPaymentSchema, req.body);
  const current = await prisma.order.findUnique({ where: { id: req.params.id }, include: orderInclude });
  if (!current) throw new AppError(404, 'Order not found.');
  if (current.paymentProvider === 'safepay' && body.paymentStatus === 'PAID') {
    throw new AppError(409, 'Safepay payments can only be confirmed by the verified webhook.');
  }
  const order = await prisma.order.update({
    where: { id: current.id },
    data: {
      paymentStatus: body.paymentStatus,
      paymentReference: body.reference || current.paymentReference,
      ...(body.paymentStatus === 'PAID' ? { status: current.status === 'PENDING' ? 'PAID' : current.status, paidAt: current.paidAt || new Date() } : {}),
    },
    include: orderInclude,
  });
  if (body.paymentStatus === 'PAID') await attemptSideEffect(emailEvents.paymentConfirmed(order));
  res.json({ order: adminOrder(order) });
}));

const allowedTransitions = {
  PENDING: ['CANCELLED'],
  PAID: [],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

app.patch('/api/admin/orders/:id/shipment', requireAdmin, asyncRoute(async (req, res) => {
  const body = validate(shipmentSchema, req.body);
  const current = await prisma.order.findUnique({ where: { id: req.params.id }, include: orderInclude });
  if (!current) throw new AppError(404, 'Order not found.');
  const canShipCod = current.paymentMethodCode === 'cod' && current.paymentStatus === 'UNPAID' && current.status === 'PENDING';
  const canShipPaid = ['PAID', 'SHIPPED'].includes(current.status) && current.paymentStatus === 'PAID';
  if (!canShipCod && !canShipPaid) {
    throw new AppError(409, 'This order must be paid, or use cash on delivery, before it can be shipped.');
  }

  const order = await prisma.order.update({
    where: { id: current.id },
    data: {
      status: 'SHIPPED',
      carrier: body.carrier,
      trackingNumber: body.trackingNumber,
      trackingUrl: body.trackingUrl || null,
      estimatedDelivery: body.estimatedDelivery ? new Date(body.estimatedDelivery) : null,
      shippedAt: current.shippedAt || new Date(),
    },
    include: orderInclude,
  });
  await attemptSideEffect(emailEvents.shipped(order));
  res.json({ order: adminOrder(order) });
}));

app.patch('/api/admin/orders/:id/status', requireAdmin, asyncRoute(async (req, res) => {
  const { status } = validate(orderStatusSchema, req.body);
  const current = await prisma.order.findUnique({ where: { id: req.params.id }, include: { items: true } });
  if (!current) throw new AppError(404, 'Order not found.');
  if (!allowedTransitions[current.status].includes(status)) {
    throw new AppError(409, `Order cannot move from ${current.status} to ${status}. Paid status is controlled by the payment webhook and shipping details are required before SHIPPED.`);
  }

  const order = await prisma.$transaction(async (tx) => {
    if (status === 'CANCELLED') await restoreOrderInventory(tx, current);
    return tx.order.update({
      where: { id: current.id },
      data: {
        status,
        ...(status === 'CANCELLED' && current.paymentStatus !== 'PAID' ? { paymentStatus: 'FAILED' } : {}),
        ...(status === 'DELIVERED' ? {
          deliveredAt: new Date(),
          ...(current.paymentMethodCode === 'cod' && current.paymentStatus !== 'PAID' ? { paymentStatus: 'PAID', paidAt: new Date() } : {}),
        } : {}),
      },
      include: orderInclude,
    });
  });

  if (status === 'CANCELLED') await attemptSideEffect(emailEvents.cancelled(order));
  if (status === 'DELIVERED') await attemptSideEffect(emailEvents.delivered(order));
  res.json({ order: adminOrder(order) });
}));

app.get('/api/admin/reviews', requireAdmin, asyncRoute(async (req, res) => {
  const status = queryChoice(req.query.status, 'status', ['PENDING', 'APPROVED', 'REJECTED'], '');
  const reviews = await prisma.review.findMany({
    where: status ? { status } : {},
    include: {
      product: { select: { id: true, name: true, images: true } },
      user: { select: { id: true, name: true, email: true } },
      order: { select: { id: true, source: true, createdAt: true } },
      createdByAdmin: { select: { id: true, name: true, email: true } },
      updatedByAdmin: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });
  res.json({ reviews });
}));

app.post('/api/admin/reviews', requireAdmin, asyncRoute(async (req, res) => {
  const body = validate(adminReviewCreateSchema, req.body);
  const product = await prisma.product.findUnique({ where: { id: body.productId }, select: { id: true } });
  if (!product) throw new AppError(404, 'Product not found.');
  const review = await prisma.review.create({
    data: {
      productId: body.productId,
      reviewerName: body.reviewerName,
      reviewerEmail: body.reviewerEmail || null,
      rating: body.rating,
      title: body.title || null,
      body: body.body,
      status: body.status,
      source: 'MANUAL',
      isFeatured: body.isFeatured,
      isVerifiedPurchase: false,
      adminNote: body.adminNote || null,
      createdByAdminId: req.admin.id,
      updatedByAdminId: req.admin.id,
    },
    include: { product: { select: { id: true, name: true, images: true } } },
  });
  res.status(201).json({ review });
}));

app.patch('/api/admin/reviews/:id', requireAdmin, asyncRoute(async (req, res) => {
  const body = validate(adminReviewUpdateSchema, req.body);
  const current = await prisma.review.findUnique({ where: { id: req.params.id } });
  if (!current) throw new AppError(404, 'Review not found.');
  const contentChanged = ['reviewerName', 'reviewerEmail', 'rating', 'title', 'body'].some((key) => Object.prototype.hasOwnProperty.call(body, key));
  const review = await prisma.review.update({
    where: { id: current.id },
    data: {
      ...body,
      updatedByAdminId: req.admin.id,
      ...(contentChanged && current.source === 'WEBSITE' ? { editedByAdminAt: new Date() } : {}),
    },
    include: {
      product: { select: { id: true, name: true, images: true } },
      user: { select: { id: true, name: true, email: true } },
      order: { select: { id: true, source: true, createdAt: true } },
      createdByAdmin: { select: { id: true, name: true, email: true } },
      updatedByAdmin: { select: { id: true, name: true, email: true } },
    },
  });
  res.json({ review });
}));

app.delete('/api/admin/reviews/:id', requireAdmin, requireSuperadmin, asyncRoute(async (req, res) => {
  await prisma.review.delete({ where: { id: req.params.id } });
  res.status(204).send();
}));

app.use((_req, _res, next) => next(new AppError(404, 'Route not found.')));

app.use((error, _req, res, _next) => {
  if (error instanceof AppError) {
    return res.status(error.status).json({ message: error.message, details: error.details });
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') return res.status(409).json({ message: 'A record with this value already exists.' });
    if (error.code === 'P2025') return res.status(404).json({ message: 'The requested record was not found.' });
    if (error.code === 'P2003') return res.status(400).json({ message: 'A selected category, collection, product, or related record does not exist.' });
    if (error.code === 'P2034') return res.status(409).json({ message: 'A concurrent inventory update occurred. Please retry.' });
  }
  console.error(error);
  return res.status(500).json({ message: 'An unexpected server error occurred.' });
});

module.exports = app;
