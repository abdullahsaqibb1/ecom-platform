const { Prisma } = require('@prisma/client');
const { AppError } = require('./errors');

function money(value) {
  return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value || 0);
}

function paymentProviderReady(method) {
  if (!method) return false;
  if (method.provider === 'safepay') {
    return Boolean(process.env.SAFEPAY_API_KEY?.trim() && process.env.SAFEPAY_SECRET_KEY?.trim());
  }
  return true;
}

function publicPaymentMethod(method) {
  return {
    id: method.id,
    code: method.code,
    provider: method.provider,
    displayName: method.displayName,
    description: method.description,
    instructions: method.instructions,
    requiresOnlinePayment: method.requiresOnlinePayment,
    sortOrder: method.sortOrder,
  };
}

async function enabledPaymentMethods(tx) {
  const methods = await tx.paymentMethod.findMany({
    orderBy: [{ sortOrder: 'asc' }, { displayName: 'asc' }],
  });
  const readyMethods = methods.filter((method) => method.isEnabled && paymentProviderReady(method));
  if (readyMethods.length) return readyMethods;
  if (methods.length) return [];

  // Backwards-compatible fallback only when the upgraded database has no payment-method rows yet.
  return [{
    id: 'legacy-manual',
    code: 'cod',
    provider: 'manual',
    displayName: 'Cash on delivery',
    description: 'Pay when your order arrives.',
    instructions: null,
    isEnabled: true,
    requiresOnlinePayment: false,
    sortOrder: 0,
    configuration: {},
  }];
}

async function getPaymentMethod(tx, code) {
  const methods = await enabledPaymentMethods(tx);
  const method = methods.find((item) => item.code === code);
  if (!method) throw new AppError(400, 'The selected payment method is not currently available.');
  if (method.provider === 'safepay') {
    const required = ['SAFEPAY_API_KEY', 'SAFEPAY_SECRET_KEY'];
    if (required.some((key) => !process.env[key]?.trim())) {
      throw new AppError(503, 'Online payment is temporarily unavailable. Choose another payment method.');
    }
  }
  return method;
}

function discountIsCurrentlyActive(discount, now = new Date()) {
  if (!discount?.isActive) return false;
  if (discount.startsAt && discount.startsAt > now) return false;
  if (discount.endsAt && discount.endsAt < now) return false;
  if (discount.usageLimit != null && discount.usageCount >= discount.usageLimit) return false;
  return true;
}

function itemEligible(discount, product) {
  if (discount.scope === 'ALL_PRODUCTS') return true;
  if (discount.scope === 'PRODUCTS') return discount.productIds.includes(product.id);
  if (discount.scope === 'CATEGORIES') return Boolean(product.categoryId && discount.categoryIds.includes(product.categoryId));
  if (discount.scope === 'COLLECTIONS') {
    return product.collections?.some((membership) => discount.collectionIds.includes(membership.collectionId));
  }
  return false;
}

async function evaluateDiscount(tx, { code, prepared, subtotal, shippingTotal, userId, incrementUsage = false }) {
  if (!code) return { discount: null, discountTotal: money(0), discountCode: null };
  const normalized = code.trim().toUpperCase();
  const discount = await tx.discount.findUnique({ where: { code: normalized } });
  if (!discount || !discountIsCurrentlyActive(discount)) {
    throw new AppError(400, 'This discount code is invalid, expired, or no longer available.');
  }
  if (discount.minimumOrderAmount != null && money(subtotal).lessThan(discount.minimumOrderAmount)) {
    throw new AppError(400, `This code requires a minimum order of Rs ${Number(discount.minimumOrderAmount).toLocaleString()}.`);
  }
  if (discount.perCustomerLimit != null && userId) {
    const uses = await tx.order.count({
      where: { userId, discountCode: normalized, status: { not: 'CANCELLED' } },
    });
    if (uses >= discount.perCustomerLimit) throw new AppError(400, 'You have already used this discount the maximum number of times.');
  }

  let eligibleSubtotal = money(0);
  for (const item of prepared) {
    if (itemEligible(discount, item.product)) {
      eligibleSubtotal = eligibleSubtotal.plus(money(item.unitPrice).mul(item.requested.quantity));
    }
  }
  if (discount.scope !== 'ALL_PRODUCTS' && eligibleSubtotal.lessThanOrEqualTo(0)) {
    throw new AppError(400, 'This discount does not apply to the selected products.');
  }

  let discountTotal = money(0);
  if (discount.type === 'PERCENTAGE') {
    discountTotal = eligibleSubtotal.mul(discount.value).div(100);
  } else if (discount.type === 'FIXED_AMOUNT') {
    discountTotal = Prisma.Decimal.min(eligibleSubtotal, discount.value);
  } else if (discount.type === 'FREE_SHIPPING') {
    discountTotal = money(shippingTotal);
  }
  if (discount.maximumDiscountAmount != null) {
    discountTotal = Prisma.Decimal.min(discountTotal, discount.maximumDiscountAmount);
  }
  discountTotal = Prisma.Decimal.max(discountTotal, money(0)).toDecimalPlaces(2);

  if (incrementUsage) {
    const update = await tx.discount.updateMany({
      where: {
        id: discount.id,
        isActive: true,
        ...(discount.usageLimit == null ? {} : { usageCount: { lt: discount.usageLimit } }),
      },
      data: { usageCount: { increment: 1 } },
    });
    if (update.count !== 1) throw new AppError(409, 'This discount reached its usage limit.');
  }

  return { discount, discountTotal, discountCode: normalized };
}

async function createInventoryMovement(tx, data) {
  return tx.inventoryMovement.create({
    data: {
      productId: data.productId,
      variantId: data.variantId || null,
      adminId: data.adminId || null,
      type: data.type,
      quantityChange: data.quantityChange,
      stockAfter: data.stockAfter,
      reason: data.reason || null,
      reference: data.reference || null,
    },
  });
}

module.exports = {
  paymentProviderReady,
  publicPaymentMethod,
  enabledPaymentMethods,
  getPaymentMethod,
  evaluateDiscount,
  createInventoryMovement,
};
