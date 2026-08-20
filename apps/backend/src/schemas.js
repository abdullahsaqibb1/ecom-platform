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
  turnstileToken: z.string().trim().min(1).max(2048).optional(),
}).strict();

const loginSchema = z.object({
  email,
  password,
  turnstileToken: z.string().trim().min(1).max(2048).optional(),
}).strict();

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
}).strict();

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


const storefrontLinkSchema = z.object({
  label: z.string().trim().min(1).max(100),
  href: z.string().trim().min(1).max(500),
  isVisible: z.boolean().optional().default(true),
}).strict();

const homepagePanelSchema = z.object({
  eyebrow: z.string().trim().max(120).default(''),
  heading: z.string().trim().min(2).max(300),
  ctaLabel: z.string().trim().max(100).default(''),
  ctaUrl: z.string().trim().max(500).default(''),
  imageUrl: z.union([z.literal(''), httpUrl]).default(''),
}).strict();

const homepageSchema = z.object({
  hero: z.object({
    eyebrow: z.string().trim().max(160).default(''),
    heading: z.string().trim().min(2).max(500),
    body: z.string().trim().max(1000).default(''),
    ctaLabel: z.string().trim().max(100).default(''),
    ctaUrl: z.string().trim().max(500).default(''),
    imageUrl: z.union([z.literal(''), httpUrl]).default(''),
    visualType: z.enum(['EARBUDS_ANIMATION', 'IMAGE']).default('EARBUDS_ANIMATION'),
  }).strict(),
  productSections: z.array(z.object({
    title: z.string().trim().min(1).max(120),
    collectionSlug: z.string().trim().min(1).max(140),
    limit: z.coerce.number().int().min(1).max(12).default(4),
  }).strict()).max(6).default([]),
  editorialPanels: z.array(homepagePanelSchema).max(4).default([]),
  statement: z.object({
    eyebrow: z.string().trim().max(120).default(''),
    heading: z.string().trim().min(2).max(700),
    ctaLabel: z.string().trim().max(100).default(''),
    ctaUrl: z.string().trim().max(500).default(''),
  }).strict(),
  mosaic: z.array(z.object({
    label: z.string().trim().min(1).max(100),
    href: z.string().trim().min(1).max(500),
    imageUrl: z.union([z.literal(''), httpUrl]).default(''),
  }).strict()).max(6).default([]),
}).strict();

const footerSchema = z.object({
  newsletterEyebrow: z.string().trim().max(120).default(''),
  newsletterHeading: z.string().trim().max(300).default(''),
  brandDescription: z.string().trim().max(1000).default(''),
  columns: z.array(z.object({
    heading: z.string().trim().min(1).max(100),
    links: z.array(storefrontLinkSchema.omit({ isVisible: true })).max(12).default([]),
  }).strict()).max(4).default([]),
  supportHeading: z.string().trim().max(100).default('Support'),
  supportLines: stringList(200, 10),
  legalLinks: z.array(storefrontLinkSchema.omit({ isVisible: true })).max(8).default([]),
}).strict();

const themeSchema = z.object({
  paper: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/),
  ink: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/),
  muted: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/),
  soft: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/),
  cream: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/),
}).strict();

const storefrontFontFamilySchema = z.enum([
  'Italiana', 'Cormorant Garamond', 'Playfair Display', 'Bodoni Moda', 'DM Serif Display',
  'Libre Baskerville', 'Instrument Serif', 'Lora', 'DM Sans', 'Inter', 'Manrope',
  'Plus Jakarta Sans', 'Montserrat', 'Poppins', 'Nunito Sans', 'Work Sans',
  'Source Sans 3', 'Space Grotesk',
]);
const storefrontFontWeightSchema = z.union([z.literal(400), z.literal(500), z.literal(600), z.literal(700)]);
const storefrontTrackingSchema = z.coerce.number().min(-0.08).max(0.25);
const typographySchema = z.object({
  preset: z.enum(['COSMIC_EDITORIAL', 'MODERN_LUXURY', 'FASHION_MAGAZINE', 'CLEAN_COMMERCE', 'MINIMAL_TECH', 'MODERN_SANS', 'CUSTOM']),
  displayFont: storefrontFontFamilySchema,
  bodyFont: storefrontFontFamilySchema,
  navFont: storefrontFontFamilySchema,
  buttonFont: storefrontFontFamilySchema,
  labelFont: storefrontFontFamilySchema,
  displayWeight: storefrontFontWeightSchema,
  bodyWeight: storefrontFontWeightSchema,
  navWeight: storefrontFontWeightSchema,
  buttonWeight: storefrontFontWeightSchema,
  labelWeight: storefrontFontWeightSchema,
  displayLetterSpacing: storefrontTrackingSchema,
  bodyLetterSpacing: storefrontTrackingSchema,
  navLetterSpacing: storefrontTrackingSchema,
  buttonLetterSpacing: storefrontTrackingSchema,
  labelLetterSpacing: storefrontTrackingSchema,
}).strict();

const storefrontSettingsSchema = z.object({
  siteName: z.string().trim().min(2).max(120),
  logoUrl: optionalHttpUrl,
  logoAlt: nullableText(160),
  faviconUrl: optionalHttpUrl,
  announcementText: nullableText(300),
  announcementLinkLabel: nullableText(100),
  announcementLinkUrl: z.string().trim().max(500).nullable().optional(),
  supportEmail: z.union([z.literal(''), z.string().trim().email()]).transform((value) => value || null).nullable().optional(),
  supportPhone: nullableText(50),
  navigation: z.array(storefrontLinkSchema).max(16),
  homepage: homepageSchema,
  footer: footerSchema,
  theme: themeSchema,
  typography: typographySchema.optional(),
}).strict();

const contentPageFields = {
  slug,
  title: z.string().trim().min(2).max(160),
  eyebrow: nullableText(120),
  body: z.string().trim().min(1).max(50000),
  heroImage: optionalHttpUrl,
  sections: z.array(z.object({
    heading: z.string().trim().max(200).default(''),
    body: z.string().trim().max(10000).default(''),
    imageUrl: z.union([z.literal(''), httpUrl]).default(''),
  }).strict()).max(20).nullable().optional(),
  seoTitle: nullableText(70),
  seoDescription: nullableText(180),
  isPublished: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(100000).default(0),
};
const contentPageCreateSchema = z.object(contentPageFields).strict();
const contentPageUpdateSchema = z.object(Object.fromEntries(Object.entries(contentPageFields).map(([key, schema]) => [key, schema.optional()])))
  .strict().refine((value) => Object.keys(value).length > 0, 'At least one field is required.');

const orderDeleteSchema = z.object({
  reason: z.string().trim().min(3).max(500),
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
  storefrontSettingsSchema,
  contentPageCreateSchema,
  contentPageUpdateSchema,
  orderDeleteSchema,
  mediaCreateSchema,
};
