const jwt = require('jsonwebtoken');
const { AppError } = require('./errors');
const prisma = require('./prisma');

function requiredSecret(name) {
  const value = process.env[name];
  if (!value || value.length < 24) {
    throw new Error(`${name} must be configured with at least 24 characters.`);
  }
  return value;
}

function signCustomerToken(userId) {
  return jwt.sign(
    { sub: userId, kind: 'customer' },
    requiredSecret('JWT_CUSTOMER_SECRET'),
    { expiresIn: process.env.JWT_CUSTOMER_EXPIRES_IN || '7d' },
  );
}

function signAdminToken(adminId, role) {
  return jwt.sign(
    { sub: adminId, kind: 'admin', role },
    requiredSecret('JWT_ADMIN_SECRET'),
    { expiresIn: process.env.JWT_ADMIN_EXPIRES_IN || '8h' },
  );
}

function readBearer(req) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw new AppError(401, 'Authentication is required.');
  }
  return header.slice(7).trim();
}

async function requireCustomer(req, _res, next) {
  try {
    const payload = jwt.verify(readBearer(req), requiredSecret('JWT_CUSTOMER_SECRET'));
    if (!payload || payload.kind !== 'customer' || typeof payload.sub !== 'string') {
      throw new AppError(401, 'Invalid customer token.');
    }
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true, email: true, createdAt: true },
    });
    if (!user) throw new AppError(401, 'Customer account no longer exists.');
    req.customer = user;
    next();
  } catch (error) {
    if (error instanceof AppError) return next(error);
    return next(new AppError(401, 'Customer session is invalid or expired.'));
  }
}

async function requireAdmin(req, _res, next) {
  try {
    const payload = jwt.verify(readBearer(req), requiredSecret('JWT_ADMIN_SECRET'));
    if (!payload || payload.kind !== 'admin' || typeof payload.sub !== 'string') {
      throw new AppError(401, 'Invalid admin token.');
    }
    const admin = await prisma.admin.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    if (!admin) throw new AppError(401, 'Admin account no longer exists.');
    req.admin = admin;
    next();
  } catch (error) {
    if (error instanceof AppError) return next(error);
    return next(new AppError(401, 'Admin session is invalid or expired.'));
  }
}

function requireSuperadmin(req, _res, next) {
  if (!req.admin || req.admin.role !== 'SUPERADMIN') {
    return next(new AppError(403, 'Superadmin access is required.'));
  }
  next();
}

module.exports = {
  signCustomerToken,
  signAdminToken,
  requireCustomer,
  requireAdmin,
  requireSuperadmin,
};
