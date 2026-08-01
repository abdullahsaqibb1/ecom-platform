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
  requireAdmin,
  requireSuperadmin,
} = require('./auth');
const {
  customerRegisterSchema,
  loginSchema,
  adminCreateSchema,
  categoryCreateSchema,
  productCreateSchema,
  productUpdateSchema,
  orderCreateSchema,
  orderStatusSchema,
} = require('./schemas');

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
  'http://localhost:5173',
  'http://localhost:5174',
  ...splitOrigins(process.env.CUSTOMER_ORIGINS),
  ...splitOrigins(process.env.ADMIN_ORIGINS),
]);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin.replace(/\/$/, ''))) return callback(null, true);
    return callback(new AppError(403, 'This origin is not allowed by CORS.'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}));
app.use(express.json({ limit: '1mb' }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. Please try again later.' },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts. Please try again later.' },
});
app.use('/api', apiLimiter);
app.use('/api/auth', authLimiter);
app.use('/api/admin/auth', authLimiter);

const productInclude = {
  category: { select: { id: true, name: true, slug: true } },
  variants: { orderBy: [{ color: 'asc' }, { size: 'asc' }] },
};
const orderInclude = {
  user: { select: { id: true, name: true, email: true } },
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

async function uniqueCategorySlug(name, requested) {
  const root = baseSlug(requested || name);
  let candidate = root;
  let suffix = 2;
  while (await prisma.category.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    candidate = `${root}-${suffix++}`;
  }
  return candidate;
}

function cleanProductData(input, slug) {
  const {
    variants,
    price,
    compareAtPrice,
    categoryId,
    ...rest
  } = input;
  return {
    ...rest,
    slug,
    price: new Prisma.Decimal(price),
    compareAtPrice: compareAtPrice == null ? null : new Prisma.Decimal(compareAtPrice),
    categoryId: categoryId || null,
  };
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function parsePagination(query) {
  const page = Math.max(1, Number.parseInt(String(query.page || '1'), 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(String(query.limit || '24'), 10) || 24));
  return { page, limit, skip: (page - 1) * limit };
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

// Customer authentication: customer tokens are signed with the customer-only secret.
app.post('/api/auth/register', asyncRoute(async (req, res) => {
  const body = validate(customerRegisterSchema, req.body);
  const exists = await prisma.user.findUnique({ where: { email: body.email }, select: { id: true } });
  if (exists) throw new AppError(409, 'A customer account with this email already exists.');
  const user = await prisma.user.create({
    data: {
      name: body.name,
      email: body.email,
      passwordHash: await bcrypt.hash(body.password, 12),
    },
  });
  res.status(201).json({ token: signCustomerToken(user.id), user: publicUser(user) });
}));

app.post('/api/auth/login', asyncRoute(async (req, res) => {
  const body = validate(loginSchema, req.body);
  const user = await prisma.user.findUnique({ where: { email: body.email } });
  if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
    throw new AppError(401, 'Invalid customer email or password.');
  }
  res.json({ token: signCustomerToken(user.id), user: publicUser(user) });
}));

app.get('/api/me', requireCustomer, (req, res) => {
  res.json({ user: req.customer });
});

// Public catalog.
app.get('/api/categories', asyncRoute(async (_req, res) => {
  const categories = await prisma.category.findMany({
    where: { products: { some: { isActive: true } } },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, slug: true },
  });
  res.json({ categories });
}));

app.get('/api/products', asyncRoute(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';
  const where = {
    isActive: true,
    ...(search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: { has: search.toLowerCase() } },
      ],
    } : {}),
    ...(category ? {
      category: { is: { OR: [
        ...(isUuid(category) ? [{ id: category }] : []),
        { slug: category },
        { name: { equals: category, mode: 'insensitive' } },
      ] } },
    } : {}),
  };
  const [products, total] = await prisma.$transaction([
    prisma.product.findMany({ where, include: productInclude, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.product.count({ where }),
  ]);
  res.json({
    products,
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  });
}));

app.get('/api/products/:idOrSlug', asyncRoute(async (req, res) => {
  const key = req.params.idOrSlug;
  const product = await prisma.product.findFirst({
    where: { isActive: true, OR: [...(isUuid(key) ? [{ id: key }] : []), { slug: key }] },
    include: productInclude,
  });
  if (!product) throw new AppError(404, 'Product not found.');
  res.json({ product });
}));

// Customer order creation: prices and inventory are resolved only on the server.
app.post('/api/orders', requireCustomer, asyncRoute(async (req, res) => {
  const body = validate(orderCreateSchema, req.body);
  const order = await prisma.$transaction(async (tx) => {
    const prepared = [];
    let total = new Prisma.Decimal(0);

    for (const requested of body.items) {
      const product = await tx.product.findUnique({
        where: { id: requested.productId },
        include: { variants: true },
      });
      if (!product || !product.isActive) throw new AppError(404, 'One of the selected products is unavailable.');

      let variant = null;
      if (requested.variantId) {
        variant = product.variants.find((item) => item.id === requested.variantId) || null;
        if (!variant) throw new AppError(400, `The selected variant for ${product.name} is invalid.`);
      } else if (product.variants.length > 0) {
        throw new AppError(400, `Select a size or color option for ${product.name}.`);
      }

      const available = variant ? variant.stock : product.stock;
      if (available < requested.quantity) {
        throw new AppError(409, `${product.name} does not have enough stock.`);
      }

      const unitPrice = variant?.price || product.price;
      total = total.plus(unitPrice.mul(requested.quantity));
      prepared.push({ product, variant, requested, unitPrice });
    }

    for (const item of prepared) {
      if (item.variant) {
        const changedVariant = await tx.productVariant.updateMany({
          where: { id: item.variant.id, stock: { gte: item.requested.quantity } },
          data: { stock: { decrement: item.requested.quantity } },
        });
        if (changedVariant.count !== 1) throw new AppError(409, `${item.product.name} stock changed. Please retry.`);
        const changedProduct = await tx.product.updateMany({
          where: { id: item.product.id, stock: { gte: item.requested.quantity } },
          data: { stock: { decrement: item.requested.quantity } },
        });
        if (changedProduct.count !== 1) throw new AppError(409, `${item.product.name} stock changed. Please retry.`);
      } else {
        const changedProduct = await tx.product.updateMany({
          where: { id: item.product.id, stock: { gte: item.requested.quantity } },
          data: { stock: { decrement: item.requested.quantity } },
        });
        if (changedProduct.count !== 1) throw new AppError(409, `${item.product.name} stock changed. Please retry.`);
      }
    }

    return tx.order.create({
      data: {
        userId: req.customer.id,
        status: 'PENDING',
        total,
        shippingAddress: body.shippingAddress,
        items: {
          create: prepared.map(({ product, variant, requested, unitPrice }) => ({
            productId: product.id,
            variantId: variant?.id || null,
            productName: product.name,
            variantLabel: variant ? [variant.color, variant.size].filter(Boolean).join(' / ') : null,
            unitPrice,
            quantity: requested.quantity,
          })),
        },
      },
      include: orderInclude,
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  res.status(201).json({ order });
}));

app.get('/api/orders', requireCustomer, asyncRoute(async (req, res) => {
  const orders = await prisma.order.findMany({
    where: { userId: req.customer.id },
    include: orderInclude,
    orderBy: { createdAt: 'desc' },
  });
  res.json({ orders });
}));

// Admin authentication: admin tokens use a separate secret and cannot authenticate customer endpoints.
app.post('/api/admin/auth/login', asyncRoute(async (req, res) => {
  const body = validate(loginSchema, req.body);
  const admin = await prisma.admin.findUnique({ where: { email: body.email } });
  if (!admin || !(await bcrypt.compare(body.password, admin.passwordHash))) {
    throw new AppError(401, 'Invalid admin email or password.');
  }
  const safeAdmin = { id: admin.id, name: admin.name, email: admin.email, role: admin.role, createdAt: admin.createdAt };
  res.json({ token: signAdminToken(admin.id, admin.role), admin: safeAdmin });
}));

app.get('/api/admin/me', requireAdmin, (req, res) => {
  res.json({ admin: req.admin });
});

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

app.get('/api/admin/categories', requireAdmin, asyncRoute(async (_req, res) => {
  const rows = await prisma.category.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { name: 'asc' },
  });
  res.json({ categories: rows.map(({ _count, ...category }) => ({ ...category, productCount: _count.products })) });
}));

app.post('/api/admin/categories', requireAdmin, asyncRoute(async (req, res) => {
  const body = validate(categoryCreateSchema, req.body);
  const category = await prisma.category.create({
    data: { name: body.name, slug: await uniqueCategorySlug(body.name, body.slug) },
  });
  res.status(201).json({ category });
}));

app.delete('/api/admin/categories/:id', requireAdmin, asyncRoute(async (req, res) => {
  await prisma.$transaction([
    prisma.product.updateMany({ where: { categoryId: req.params.id }, data: { categoryId: null } }),
    prisma.category.delete({ where: { id: req.params.id } }),
  ]);
  res.status(204).send();
}));

app.get('/api/admin/products', requireAdmin, asyncRoute(async (req, res) => {
  const { page, limit, skip } = parsePagination({ ...req.query, limit: req.query.limit || '100' });
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const where = search ? {
    OR: [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ],
  } : {};
  const [products, total] = await prisma.$transaction([
    prisma.product.findMany({ where, include: productInclude, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.product.count({ where }),
  ]);
  res.json({ products, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } });
}));

app.post('/api/admin/products', requireAdmin, asyncRoute(async (req, res) => {
  const body = validate(productCreateSchema, req.body);
  const slug = await uniqueProductSlug(body.name, body.slug);
  const variantStock = body.variants?.reduce((sum, variant) => sum + variant.stock, 0);
  const product = await prisma.product.create({
    data: {
      ...cleanProductData({ ...body, stock: body.variants?.length ? variantStock : body.stock }, slug),
      ...(body.variants?.length ? {
        variants: {
          create: body.variants.map(({ id: _id, price, ...variant }) => ({
            ...variant,
            price: price == null ? null : new Prisma.Decimal(price),
          })),
        },
      } : {}),
    },
    include: productInclude,
  });
  res.status(201).json({ product });
}));

async function updateProduct(req, res) {
  const body = validate(productUpdateSchema, req.body);
  const current = await prisma.product.findUnique({ where: { id: req.params.id }, include: { variants: true } });
  if (!current) throw new AppError(404, 'Product not found.');
  const slug = body.name || body.slug
    ? await uniqueProductSlug(body.name || current.name, body.slug || current.slug, current.id)
    : current.slug;
  const { variants, ...withoutVariants } = body;
  const data = cleanProductData({
    name: withoutVariants.name ?? current.name,
    description: withoutVariants.description ?? current.description,
    price: withoutVariants.price ?? Number(current.price),
    compareAtPrice: Object.prototype.hasOwnProperty.call(withoutVariants, 'compareAtPrice')
      ? withoutVariants.compareAtPrice
      : current.compareAtPrice == null ? null : Number(current.compareAtPrice),
    stock: withoutVariants.stock ?? current.stock,
    images: withoutVariants.images ?? current.images,
    isActive: withoutVariants.isActive ?? current.isActive,
    categoryId: Object.prototype.hasOwnProperty.call(withoutVariants, 'categoryId') ? withoutVariants.categoryId : current.categoryId,
    color: Object.prototype.hasOwnProperty.call(withoutVariants, 'color') ? withoutVariants.color : current.color,
    material: Object.prototype.hasOwnProperty.call(withoutVariants, 'material') ? withoutVariants.material : current.material,
    careInstructions: withoutVariants.careInstructions ?? current.careInstructions,
    tags: withoutVariants.tags ?? current.tags,
  }, slug);

  const product = await prisma.$transaction(async (tx) => {
    if (variants) {
      const existingIds = new Set(current.variants.map((variant) => variant.id));
      const providedIds = new Set(variants.flatMap((variant) => variant.id ? [variant.id] : []));
      for (const id of providedIds) {
        if (!existingIds.has(id)) throw new AppError(400, 'A supplied variant does not belong to this product.');
      }

      const omittedIds = current.variants.map((variant) => variant.id).filter((id) => !providedIds.has(id));
      if (omittedIds.length) {
        const referenced = await tx.orderItem.findMany({
          where: { variantId: { in: omittedIds } },
          select: { variantId: true },
          distinct: ['variantId'],
        });
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
          stock: variant.stock,
          image: variant.image || null,
        };
        if (variant.id) {
          await tx.productVariant.update({ where: { id: variant.id }, data: variantData });
        } else {
          await tx.productVariant.create({ data: { ...variantData, productId: current.id } });
        }
      }
      if (variants.length) data.stock = variants.reduce((sum, variant) => sum + variant.stock, 0);
    }
    return tx.product.update({ where: { id: current.id }, data, include: productInclude });
  });
  res.json({ product });
}

app.put('/api/admin/products/:id', requireAdmin, asyncRoute(updateProduct));
app.patch('/api/admin/products/:id', requireAdmin, asyncRoute(updateProduct));

app.delete('/api/admin/products/:id', requireAdmin, asyncRoute(async (req, res) => {
  const product = await prisma.product.update({
    where: { id: req.params.id },
    data: { isActive: false },
    include: productInclude,
  });
  res.json({ product });
}));

app.get('/api/admin/orders', requireAdmin, asyncRoute(async (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const allowed = ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
  if (status && !allowed.includes(status)) throw new AppError(400, 'Invalid order status filter.');
  const orders = await prisma.order.findMany({
    where: status ? { status } : {},
    include: orderInclude,
    orderBy: { createdAt: 'desc' },
  });
  res.json({ orders });
}));

app.get('/api/admin/orders/:id', requireAdmin, asyncRoute(async (req, res) => {
  const order = await prisma.order.findUnique({ where: { id: req.params.id }, include: orderInclude });
  if (!order) throw new AppError(404, 'Order not found.');
  res.json({ order });
}));

const allowedTransitions = {
  PENDING: ['PAID', 'CANCELLED'],
  PAID: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

app.patch('/api/admin/orders/:id/status', requireAdmin, asyncRoute(async (req, res) => {
  const { status } = validate(orderStatusSchema, req.body);
  const current = await prisma.order.findUnique({ where: { id: req.params.id }, include: { items: true } });
  if (!current) throw new AppError(404, 'Order not found.');
  if (!allowedTransitions[current.status].includes(status)) {
    throw new AppError(409, `Order cannot move from ${current.status} to ${status}.`);
  }

  const order = await prisma.$transaction(async (tx) => {
    if (status === 'CANCELLED') {
      for (const item of current.items) {
        await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
        if (item.variantId) {
          await tx.productVariant.update({ where: { id: item.variantId }, data: { stock: { increment: item.quantity } } });
        }
      }
    }
    return tx.order.update({ where: { id: current.id }, data: { status }, include: orderInclude });
  });
  res.json({ order });
}));

app.use((_req, _res, next) => next(new AppError(404, 'Route not found.')));

app.use((error, _req, res, _next) => {
  if (error instanceof AppError) {
    return res.status(error.status).json({ message: error.message, details: error.details });
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') return res.status(409).json({ message: 'A record with this value already exists.', details: error.meta });
    if (error.code === 'P2025') return res.status(404).json({ message: 'The requested record was not found.' });
    if (error.code === 'P2034') return res.status(409).json({ message: 'A concurrent inventory update occurred. Please retry.' });
  }
  console.error(error);
  return res.status(500).json({ message: 'An unexpected server error occurred.' });
});

module.exports = app;
