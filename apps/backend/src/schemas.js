const { z } = require('zod');

const email = z.string().trim().email().transform((value) => value.toLowerCase());
const password = z.string().min(8).max(128);
const uuid = z.string().uuid();
const httpUrl = z.string().trim().url().refine((value) => {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}, 'URL must use http or https.');
const httpsUrl = httpUrl.refine((value) => new URL(value).protocol === 'https:', 'URL must use https.');

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
  slug: z.string().trim().min(2).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
}).strict();

const variantSchema = z.object({
  id: uuid.optional(),
  sku: z.string().trim().min(2).max(100),
  size: z.string().trim().max(40).nullable().optional(),
  color: z.string().trim().max(60).nullable().optional(),
  price: z.coerce.number().nonnegative().nullable().optional(),
  stock: z.coerce.number().int().nonnegative(),
  image: httpUrl.nullable().optional(),
}).strict();

const productFields = {
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(2).max(140).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  description: z.string().trim().min(10).max(10000),
  price: z.coerce.number().nonnegative(),
  compareAtPrice: z.coerce.number().nonnegative().nullable().optional(),
  stock: z.coerce.number().int().nonnegative(),
  images: z.array(httpUrl).max(12).default([]),
  isActive: z.boolean().default(true),
  categoryId: uuid.nullable().optional(),
  color: z.string().trim().max(60).nullable().optional(),
  material: z.string().trim().max(500).nullable().optional(),
  careInstructions: z.array(z.string().trim().min(1).max(300)).max(12).default([]),
  tags: z.array(z.string().trim().min(1).max(60)).max(24).default([]),
  variants: z.array(variantSchema).max(100).optional(),
};

const productCreateSchema = z.object(productFields).strict();
const productUpdateSchema = z.object({
  ...Object.fromEntries(Object.entries(productFields).map(([key, schema]) => [key, schema.optional()])),
}).strict().refine((value) => Object.keys(value).length > 0, 'At least one field is required.');

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
  productCreateSchema,
  productUpdateSchema,
  orderCreateSchema,
  orderStatusSchema,
  shipmentSchema,
  mediaCreateSchema,
};
