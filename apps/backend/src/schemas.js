const { z } = require('zod');

const email = z.string().trim().email().transform((value) => value.toLowerCase());
const password = z.string().min(8).max(128);
const uuid = z.string().uuid();
const slug = z.string().trim().min(2).max(140).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const nullableText = (max) => z.string().trim().max(max).nullable().optional();
const stringList = (itemMax = 120, max = 40) => z.array(z.string().trim().min(1).max(itemMax)).max(max).default([]);
const httpUrl = z.string().trim().url().refine((value) => {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}, 'URL must use http or https.');
const httpsUrl = httpUrl.refine((value) => new URL(value).protocol === 'https:', 'URL must use https.');
const optionalHttpUrl = z.union([z.literal(''), httpUrl]).transform((value) => value || null).nullable().optional();
const specificationRecord = z.record(z.string().trim().min(1).max(100), z.string().trim().max(500)).optional().default({});

const customerRegisterSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email,
  password,
}).strict();

const loginSchema = z.object({ email, password }).strict();

const adminCreateSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  email,
  password,
  role: z.enum(['STAFF', 'SUPERADMIN']).default('STAFF'),
}).strict();

const categoryCreateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: slug.optional(),
  description: nullableText(1000),
  image: optionalHttpUrl,
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(100000).default(0),
  parentId: uuid.nullable().optional(),
}).strict();
const categoryUpdateSchema = categoryCreateSchema.partial().refine((value) => Object.keys(value).length > 0, 'At least one field is required.');

const collectionCreateSchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: slug.optional(),
  description: nullableText(2000),
  image: optionalHttpUrl,
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  sortOrder: z.coerce.number().int().min(0).max(100000).default(0),
  productIds: z.array(uuid).max(1000).default([]),
}).strict();
const collectionUpdateSchema = collectionCreateSchema.partial().refine((value) => Object.keys(value).length > 0, 'At least one field is required.');

const variantSchema = z.object({
  id: uuid.optional(),
  sku: z.string().trim().min(2).max(100),
  size: nullableText(80),
  color: nullableText(80),
  price: z.coerce.number().nonnegative().nullable().optional(),
  costPrice: z.coerce.number().nonnegative().nullable().optional(),
  stock: z.coerce.number().int().nonnegative(),
  lowStockThreshold: z.coerce.number().int().nonnegative().max(100000).default(3),
  barcode: nullableText(100),
  compatibility: stringList(100, 50),
  specifications: specificationRecord,
  image: optionalHttpUrl,
}).strict();

const productFields = {
  name: z.string().trim().min(2).max(160),
  slug: slug.optional(),
  description: z.string().trim().min(10).max(20000),
  price: z.coerce.number().nonnegative(),
  compareAtPrice: z.coerce.number().nonnegative().nullable().optional(),
  costPrice: z.coerce.number().nonnegative().nullable().optional(),
  stock: z.coerce.number().int().nonnegative(),
  lowStockThreshold: z.coerce.number().int().nonnegative().max(100000).default(5),
  images: z.array(httpUrl).max(20).default([]),
  isActive: z.boolean().default(true),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).default('ACTIVE'),
  isFeatured: z.boolean().default(false),
  categoryId: uuid.nullable().optional(),
  collectionIds: z.array(uuid).max(100).default([]),
  brand: nullableText(100),
  model: nullableText(120),
  barcode: nullableText(100),
  condition: nullableText(50),
  warrantyMonths: z.coerce.number().int().nonnegative().max(240).nullable().optional(),
  compatibility: stringList(100, 50),
  specifications: specificationRecord,
  highlights: stringList(300, 20),
  whatsInBox: stringList(300, 20),
  seoTitle: nullableText(70),
  seoDescription: nullableText(180),
  color: nullableText(80),
  material: nullableText(500),
  careInstructions: stringList(300, 20),
  tags: stringList(80, 40),
  variants: z.array(variantSchema).max(200).optional(),
};

const productCreateSchema = z.object(productFields).strict();
const productUpdateSchema = z.object({
  ...Object.fromEntries(Object.entries(productFields).map(([key, schema]) => [key, schema.optional()])),
}).strict().refine((value) => Object.keys(value).length > 0, 'At least one field is required.');

const productBulkActionSchema = z.object({
  productIds: z.array(uuid).min(1).max(1000),
  action: z.enum(['ACTIVATE', 'DEACTIVATE', 'ARCHIVE', 'FEATURE', 'UNFEATURE', 'MOVE_CATEGORY', 'ADD_COLLECTION', 'REMOVE_COLLECTION', 'SET_LOW_STOCK', 'DELETE']),
  categoryId: uuid.nullable().optional(),
  collectionId: uuid.optional(),
  lowStockThreshold: z.coerce.number().int().nonnegative().max(100000).optional(),
}).strict();

const inventoryAdjustmentSchema = z.object({
  productId: uuid,
  variantId: uuid.nullable().optional(),
  quantityChange: z.coerce.number().int().min(-1000000).max(1000000).refine((value) => value !== 0, 'Quantity change cannot be zero.'),
  type: z.enum(['ADJUSTMENT', 'RETURN', 'DAMAGE', 'RESTOCK']).default('ADJUSTMENT'),
  reason: z.string().trim().min(3).max(500),
  reference: nullableText(150),
}).strict();

const discountFields = {
  name: z.string().trim().min(2).max(120),
  code: z.string().trim().min(2).max(50).regex(/^[A-Za-z0-9_-]+$/).transform((value) => value.toUpperCase()),
  description: nullableText(1000),
  type: z.enum(['PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SHIPPING']),
  scope: z.enum(['ALL_PRODUCTS', 'PRODUCTS', 'CATEGORIES', 'COLLECTIONS']).default('ALL_PRODUCTS'),
  value: z.coerce.number().nonnegative(),
  minimumOrderAmount: z.coerce.number().nonnegative().nullable().optional(),
  maximumDiscountAmount: z.coerce.number().nonnegative().nullable().optional(),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
  usageLimit: z.coerce.number().int().positive().nullable().optional(),
  perCustomerLimit: z.coerce.number().int().positive().nullable().optional(),
  productIds: z.array(uuid).max(1000).default([]),
  categoryIds: z.array(uuid).max(200).default([]),
  collectionIds: z.array(uuid).max(200).default([]),
  isActive: z.boolean().default(true),
};
function validateDiscountDates(value, ctx) {
  if (value.type === 'PERCENTAGE' && value.value != null && value.value > 100) ctx.addIssue({ code: 'custom', path: ['value'], message: 'Percentage cannot exceed 100.' });
  if (value.startsAt && value.endsAt && new Date(value.endsAt) <= new Date(value.startsAt)) ctx.addIssue({ code: 'custom', path: ['endsAt'], message: 'End date must be after the start date.' });
}
const discountCreateSchema = z.object(discountFields).strict().superRefine(validateDiscountDates);
const discountUpdateSchema = z.object(
  Object.fromEntries(Object.entries(discountFields).map(([key, schema]) => [key, schema.optional()])),
).strict().refine((value) => Object.keys(value).length > 0, 'At least one field is required.').superRefine(validateDiscountDates);
const discountValidateSchema = z.object({
  code: z.string().trim().min(2).max(50).transform((value) => value.toUpperCase()),
  items: z.array(z.object({ productId: uuid, variantId: uuid.nullable().optional(), quantity: z.coerce.number().int().min(1).max(20) }).strict()).min(1).max(50),
}).strict();

const paymentMethodCreateSchema = z.object({
  code: z.string().trim().min(2).max(50).regex(/^[a-z0-9_-]+$/),
  provider: z.string().trim().min(2).max(50),
  displayName: z.string().trim().min(2).max(100),
  description: nullableText(500),
  instructions: nullableText(2000),
  isEnabled: z.boolean().default(false),
  requiresOnlinePayment: z.boolean().default(false),
  sortOrder: z.coerce.number().int().min(0).max(100000).default(0),
  configuration: specificationRecord,
}).strict();
const paymentMethodUpdateSchema = paymentMethodCreateSchema.partial().omit({ code: true }).refine((value) => Object.keys(value).length > 0, 'At least one field is required.');

const shippingAddressSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(7).max(30),
  address1: z.string().trim().min(5).max(250),
  city: z.string().trim().min(2).max(100),
  province: z.string().trim().min(2).max(100),
  postalCode: z.string().trim().max(30).optional().default(''),
}).passthrough();

const orderCreateSchema = z.object({
  items: z.array(z.object({
    productId: uuid,
    variantId: uuid.nullable().optional(),
    quantity: z.coerce.number().int().min(1).max(20),
  }).strict()).min(1).max(50),
  shippingAddress: shippingAddressSchema,
  paymentMethodCode: z.string().trim().min(2).max(50).default('cod'),
  discountCode: z.string().trim().max(50).transform((value) => value.toUpperCase()).nullable().optional(),
  customerNote: nullableText(1000),
}).strict();


const manualPaymentSchema = z.object({
  paymentStatus: z.enum(['UNPAID', 'PAID', 'REFUNDED']),
  reference: nullableText(200),
}).strict();

const orderStatusSchema = z.object({
  status: z.enum(['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
}).strict();

const shipmentSchema = z.object({
  carrier: z.string().trim().min(2).max(100),
  trackingNumber: z.string().trim().min(2).max(150),
  trackingUrl: httpUrl.nullable().optional(),
  estimatedDelivery: z.string().datetime().nullable().optional(),
}).strict();

const mediaCreateSchema = z.object({
  publicId: z.string().trim().min(2).max(500),
  secureUrl: httpsUrl,
  format: z.string().trim().max(30).nullable().optional(),
  width: z.coerce.number().int().positive().nullable().optional(),
  height: z.coerce.number().int().positive().nullable().optional(),
  bytes: z.coerce.number().int().nonnegative().nullable().optional(),
}).strict();

module.exports = {
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
  manualPaymentSchema,
  orderStatusSchema,
  shipmentSchema,
  mediaCreateSchema,
};
