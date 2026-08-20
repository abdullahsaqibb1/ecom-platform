const jwt = require('jsonwebtoken');
const { AppError } = require('./errors');
const prisma = require('./prisma');
const {
  readCustomerSession,
  readAdminSession,
  enforceCsrf,
} = require('./security');

function requiredSecret(name) {
  const value = process.env[name];
  if (!value || value.length < 24) {
    throw new Error(`${name} must be configured with at least 24 characters.`);
  }
  return value;
}

function legacyBearerEnabled() {
  return process.env.ALLOW_LEGACY_BEARER_AUTH === 'true';
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
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice(7).trim();
}

async function authenticateLegacyCustomer(req) {
  if (!legacyBearerEnabled()) return null;
  const token = readBearer(req);
  if (!token) return null;
  const payload = jwt.verify(token, requiredSecret('JWT_CUSTOMER_SECRET'));
  if (!payload || payload.kind !== 'customer' || typeof payload.sub !== 'string') return null;
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, name: true, email: true, createdAt: true },
  });
  return user ? { user, authKind: 'bearer' } : null;
}

async function authenticateLegacyAdmin(req) {
  if (!legacyBearerEnabled()) return null;
  const token = readBearer(req);
  if (!token) return null;
  const payload = jwt.verify(token, requiredSecret('JWT_ADMIN_SECRET'));
  if (!payload || payload.kind !== 'admin' || typeof payload.sub !== 'string') return null;
  const admin = await prisma.admin.findUnique({
    where: { id: payload.sub },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
  return admin ? { admin, authKind: 'bearer' } : null;
}

async function requireCustomer(req, _res, next) {
  try {
    const session = await readCustomerSession(prisma, req);
    if (session) {
      enforceCsrf(req, session);
      req.customer = session.user;
      req.customerSession = session;
      req.authKind = 'cookie';
      return next();
    }

    const legacy = await authenticateLegacyCustomer(req);
    if (legacy) {
      req.customer = legacy.user;
      req.authKind = legacy.authKind;
      return next();
    }
    throw new AppError(401, 'Customer authentication is required.');
  } catch (error) {
    if (error instanceof AppError) return next(error);
    return next(new AppError(401, 'Customer session is invalid or expired.'));
  }
}

async function requireAdmin(req, _res, next) {
  try {
    const session = await readAdminSession(prisma, req);
    if (session) {
      enforceCsrf(req, session);
      req.admin = session.admin;
      req.adminSession = session;
      req.authKind = 'cookie';
      return next();
    }

    const legacy = await authenticateLegacyAdmin(req);
    if (legacy) {
      req.admin = legacy.admin;
      req.authKind = legacy.authKind;
      return next();
    }
    throw new AppError(401, 'Administrator authentication is required.');
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
  legacyBearerEnabled,
};
