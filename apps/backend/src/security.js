const crypto = require('node:crypto');
const { AppError } = require('./errors');

const CUSTOMER_COOKIE = 'ct_customer_session';
const ADMIN_COOKIE = 'ct_admin_session';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url');
}

function hashClientValue(value) {
  return value ? sha256(value).slice(0, 48) : null;
}

function requestIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) return forwarded.split(',')[0].trim();
  return req.ip || req.socket?.remoteAddress || '';
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  return header.split(';').reduce((acc, chunk) => {
    const index = chunk.indexOf('=');
    if (index <= 0) return acc;
    const key = chunk.slice(0, index).trim();
    const value = chunk.slice(index + 1).trim();
    if (!key) return acc;
    try { acc[key] = decodeURIComponent(value); } catch { acc[key] = value; }
    return acc;
  }, {});
}

function cookieSameSite() {
  const configured = (process.env.COOKIE_SAME_SITE || '').trim().toLowerCase();
  if (['lax', 'strict', 'none'].includes(configured)) return configured;
  return process.env.NODE_ENV === 'production' ? 'none' : 'lax';
}

function cookieOptions(maxAgeMs) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: cookieSameSite(),
    path: '/api',
    maxAge: maxAgeMs,
  };
}

function clearSessionCookie(res, name) {
  res.clearCookie(name, { ...cookieOptions(0), maxAge: undefined });
}

function customerSessionMs() {
  const days = Math.min(30, Math.max(1, Number.parseInt(process.env.CUSTOMER_SESSION_DAYS || '7', 10) || 7));
  return days * 24 * 60 * 60 * 1000;
}

function adminSessionMs() {
  const hours = Math.min(24, Math.max(1, Number.parseInt(process.env.ADMIN_SESSION_HOURS || '8', 10) || 8));
  return hours * 60 * 60 * 1000;
}

async function createCustomerSession(prisma, req, res, userId) {
  await prisma.customerSession.deleteMany({ where: { OR: [{ expiresAt: { lt: new Date() } }, { revokedAt: { not: null } }] } });
  const token = randomToken();
  const csrfToken = randomToken(24);
  const maxAgeMs = customerSessionMs();
  const session = await prisma.customerSession.create({
    data: {
      userId,
      tokenHash: sha256(token),
      csrfTokenHash: sha256(csrfToken),
      expiresAt: new Date(Date.now() + maxAgeMs),
      ipHash: hashClientValue(requestIp(req)),
      userAgentHash: hashClientValue(req.headers['user-agent'] || ''),
    },
    select: { id: true, expiresAt: true },
  });
  res.cookie(CUSTOMER_COOKIE, token, cookieOptions(maxAgeMs));
  return { session, csrfToken };
}

async function createAdminSession(prisma, req, res, adminId) {
  await prisma.adminSession.deleteMany({ where: { OR: [{ expiresAt: { lt: new Date() } }, { revokedAt: { not: null } }] } });
  const token = randomToken();
  const csrfToken = randomToken(24);
  const maxAgeMs = adminSessionMs();
  const session = await prisma.adminSession.create({
    data: {
      adminId,
      tokenHash: sha256(token),
      csrfTokenHash: sha256(csrfToken),
      expiresAt: new Date(Date.now() + maxAgeMs),
      ipHash: hashClientValue(requestIp(req)),
      userAgentHash: hashClientValue(req.headers['user-agent'] || ''),
    },
    select: { id: true, expiresAt: true },
  });
  res.cookie(ADMIN_COOKIE, token, cookieOptions(maxAgeMs));
  return { session, csrfToken };
}

function csrfMatches(session, token) {
  if (!session?.csrfTokenHash || !token) return false;
  const left = Buffer.from(session.csrfTokenHash, 'hex');
  const right = Buffer.from(sha256(token), 'hex');
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function enforceCsrf(req, session) {
  if (SAFE_METHODS.has(req.method.toUpperCase())) return;
  const token = req.headers['x-csrf-token'];
  if (typeof token !== 'string' || !csrfMatches(session, token)) {
    throw new AppError(403, 'The security token for this session is missing or invalid. Refresh the page and try again.');
  }
}

async function rotateCustomerCsrf(prisma, sessionId) {
  const csrfToken = randomToken(24);
  await prisma.customerSession.update({
    where: { id: sessionId },
    data: { csrfTokenHash: sha256(csrfToken), lastSeenAt: new Date() },
  });
  return csrfToken;
}

async function rotateAdminCsrf(prisma, sessionId) {
  const csrfToken = randomToken(24);
  await prisma.adminSession.update({
    where: { id: sessionId },
    data: { csrfTokenHash: sha256(csrfToken), lastSeenAt: new Date() },
  });
  return csrfToken;
}

async function readCustomerSession(prisma, req) {
  const token = parseCookies(req)[CUSTOMER_COOKIE];
  if (!token) return null;
  const session = await prisma.customerSession.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: { select: { id: true, name: true, email: true, createdAt: true } } },
  });
  if (!session || session.revokedAt || session.expiresAt <= new Date()) return null;
  return session;
}

async function readAdminSession(prisma, req) {
  const token = parseCookies(req)[ADMIN_COOKIE];
  if (!token) return null;
  const session = await prisma.adminSession.findUnique({
    where: { tokenHash: sha256(token) },
    include: { admin: { select: { id: true, name: true, email: true, role: true, createdAt: true } } },
  });
  if (!session || session.revokedAt || session.expiresAt <= new Date()) return null;
  return session;
}

async function revokeCustomerSession(prisma, req, res) {
  const token = parseCookies(req)[CUSTOMER_COOKIE];
  if (token) await prisma.customerSession.deleteMany({ where: { tokenHash: sha256(token) } });
  clearSessionCookie(res, CUSTOMER_COOKIE);
}

async function revokeAdminSession(prisma, req, res) {
  const token = parseCookies(req)[ADMIN_COOKIE];
  if (token) await prisma.adminSession.deleteMany({ where: { tokenHash: sha256(token) } });
  clearSessionCookie(res, ADMIN_COOKIE);
}

function sensitiveDataKey() {
  const configured = process.env.SENSITIVE_DATA_KEY?.trim();
  if (!configured) return null;
  let key;
  try {
    key = Buffer.from(configured, 'base64');
  } catch {
    throw new Error('SENSITIVE_DATA_KEY must be valid base64.');
  }
  if (key.length !== 32) throw new Error('SENSITIVE_DATA_KEY must decode to exactly 32 bytes.');
  return key;
}

function encryptJson(value) {
  const key = sensitiveDataKey();
  if (!key) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const plaintext = Buffer.from(JSON.stringify(value), 'utf8');
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ['v1', iv.toString('base64url'), tag.toString('base64url'), encrypted.toString('base64url')].join('.');
}

function decryptJson(value) {
  if (!value) return null;
  const key = sensitiveDataKey();
  if (!key) throw new AppError(500, 'Sensitive-data encryption is configured in the database but SENSITIVE_DATA_KEY is missing.');
  const [version, ivText, tagText, encryptedText] = String(value).split('.');
  if (version !== 'v1' || !ivText || !tagText || !encryptedText) throw new AppError(500, 'Stored protected data has an invalid format.');
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivText, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagText, 'base64url'));
    const plaintext = Buffer.concat([decipher.update(Buffer.from(encryptedText, 'base64url')), decipher.final()]);
    return JSON.parse(plaintext.toString('utf8'));
  } catch {
    throw new AppError(500, 'Protected customer data could not be decrypted.');
  }
}

function protectShippingAddress(address) {
  const encrypted = encryptJson(address);
  if (!encrypted) return { shippingAddress: address, shippingAddressEncrypted: null };
  return { shippingAddress: { protected: true }, shippingAddressEncrypted: encrypted };
}

function revealShippingAddress(order) {
  if (!order) return order;
  if (order.shippingAddressEncrypted) {
    return { ...order, shippingAddress: decryptJson(order.shippingAddressEncrypted), shippingAddressEncrypted: undefined };
  }
  const { shippingAddressEncrypted: _hidden, ...rest } = order;
  return rest;
}

async function verifyTurnstile(token, req) {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) return;
  if (!token) throw new AppError(400, 'Bot verification is required.');
  const form = new URLSearchParams({ secret, response: token });
  const ip = requestIp(req);
  if (ip) form.set('remoteip', ip);
  let response;
  try {
    response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw new AppError(503, 'Bot verification is temporarily unavailable. Please try again.');
  }
  const result = await response.json();
  if (!result.success) throw new AppError(400, 'Bot verification failed. Please retry the challenge.');
}

function forceHttps(req, _res, next) {
  if (process.env.NODE_ENV !== 'production') return next();
  const proto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  if (proto && proto !== 'https') return next(new AppError(400, 'HTTPS is required.'));
  return next();
}

module.exports = {
  CUSTOMER_COOKIE,
  ADMIN_COOKIE,
  sha256,
  createCustomerSession,
  createAdminSession,
  readCustomerSession,
  readAdminSession,
  rotateCustomerCsrf,
  rotateAdminCsrf,
  revokeCustomerSession,
  revokeAdminSession,
  enforceCsrf,
  protectShippingAddress,
  revealShippingAddress,
  verifyTurnstile,
  forceHttps,
};
