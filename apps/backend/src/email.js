const { Prisma } = require('@prisma/client');
const prisma = require('./prisma');

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}


function normalizeHttpUrl(value, fallback = null) {
  try {
    const candidate = value || fallback;
    if (!candidate) return null;
    const url = new URL(String(candidate));
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('unsupported protocol');
    return url.toString().replace(/\/$/, '');
  } catch {
    return fallback;
  }
}

function money(value) {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency', currency: 'PKR', maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function orderNumber(order) {
  return order.id.slice(-8).toUpperCase();
}

function lineItems(order) {
  return (order.items || []).map((item) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #e7e2da">
        <strong>${escapeHtml(item.productName)}</strong>
        ${item.variantLabel ? `<div style="color:#6b665f;font-size:13px">${escapeHtml(item.variantLabel)}</div>` : ''}
      </td>
      <td style="padding:10px 0;border-bottom:1px solid #e7e2da;text-align:center">${item.quantity}</td>
      <td style="padding:10px 0;border-bottom:1px solid #e7e2da;text-align:right">${money(Number(item.unitPrice) * item.quantity)}</td>
    </tr>`).join('');
}

function emailShell({ preview, heading, body, order }) {
  const storeName = escapeHtml(process.env.STORE_NAME || 'Cosmic Tech');
  const storefrontUrl = normalizeHttpUrl(process.env.STOREFRONT_URL, 'https://cosmictech.digital');
  const accountUrl = escapeHtml(`${storefrontUrl}/account`);
  const supportEmail = escapeHtml(process.env.SUPPORT_EMAIL || 'support@cosmictech.digital');
  const orderLink = order.userId
    ? `<a href="${accountUrl}" style="display:inline-block;margin-top:8px;padding:12px 20px;background:#111;color:#fff;text-decoration:none">View your order</a>`
    : `<a href="${escapeHtml(storefrontUrl)}" style="display:inline-block;margin-top:8px;padding:12px 20px;background:#111;color:#fff;text-decoration:none">Continue shopping</a>`;
  return `<!doctype html><html><body style="margin:0;background:#f5f2ed;font-family:Arial,sans-serif;color:#191919">
    <div style="display:none;max-height:0;overflow:hidden">${escapeHtml(preview)}</div>
    <div style="max-width:640px;margin:0 auto;padding:32px 16px">
      <div style="background:#fff;padding:32px;border:1px solid #e4ded5">
        <div style="font-size:20px;letter-spacing:.12em;text-transform:uppercase;margin-bottom:32px">${storeName}</div>
        <h1 style="font-family:Georgia,serif;font-weight:400;font-size:34px;margin:0 0 16px">${escapeHtml(heading)}</h1>
        ${body}
        <table style="width:100%;border-collapse:collapse;margin-top:24px">
          <thead><tr><th style="text-align:left;padding-bottom:8px">Item</th><th style="text-align:center;padding-bottom:8px">Qty</th><th style="text-align:right;padding-bottom:8px">Total</th></tr></thead>
          <tbody>${lineItems(order)}</tbody>
        </table>
        <div style="margin-top:20px;text-align:right"><strong>Order total: ${money(order.total)}</strong></div>
        <p style="color:#6b665f;font-size:13px;margin-top:32px">Order #${orderNumber(order)} · Questions? Email ${supportEmail}</p>
        ${orderLink}
      </div>
    </div>
  </body></html>`;
}

async function sendWithResend({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (!apiKey || !from) {
    throw new Error('RESEND_API_KEY and EMAIL_FROM are required to send transactional email.');
  }
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: [to], subject, html }),
    signal: AbortSignal.timeout(8000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.message || `Email provider returned ${response.status}.`);
  return payload?.id || null;
}

async function claimNotification(order, type) {
  const recipient = order.customerEmail || order.user?.email;
  if (!recipient) return null;
  try {
    return await prisma.notificationLog.create({
      data: { orderId: order.id, type, recipient, status: 'PENDING' },
    });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error;
    const existing = await prisma.notificationLog.findUnique({
      where: { orderId_type: { orderId: order.id, type } },
    });
    if (!existing || existing.status !== 'FAILED') return null;
    return prisma.notificationLog.update({
      where: { id: existing.id },
      data: { status: 'PENDING', error: null },
    });
  }
}

async function sendOrderEmailOnce(order, type, content) {
  const log = await claimNotification(order, type);
  if (!log) return { skipped: true };
  try {
    const providerMessageId = await sendWithResend({
      to: log.recipient,
      subject: content.subject,
      html: emailShell({ ...content, order }),
    });
    await prisma.notificationLog.update({
      where: { id: log.id },
      data: { status: 'SENT', sentAt: new Date(), providerMessageId, error: null },
    });
    return { sent: true };
  } catch (error) {
    await prisma.notificationLog.update({
      where: { id: log.id },
      data: { status: 'FAILED', error: String(error?.message || error).slice(0, 1000) },
    });
    console.error(`Transactional email ${type} failed for order ${order.id}:`, error);
    return { sent: false, error };
  }
}

function paymentBody(order) {
  return `<p style="font-size:16px;line-height:1.6">We received your payment for order <strong>#${orderNumber(order)}</strong>. Your order is now being prepared.</p>`;
}

const emailEvents = {
  orderPlaced(order, checkoutUrl) {
    const normalizedCheckoutUrl = normalizeHttpUrl(checkoutUrl);
    const safeCheckoutUrl = normalizedCheckoutUrl ? escapeHtml(normalizedCheckoutUrl) : null;
    const paymentBlock = safeCheckoutUrl
      ? `<p style="font-size:16px;line-height:1.6">Your order <strong>#${orderNumber(order)}</strong> has been reserved. Complete payment to move it into processing.</p><p><a href="${safeCheckoutUrl}" style="display:inline-block;padding:12px 20px;background:#111;color:#fff;text-decoration:none">Complete payment</a></p>`
      : `<p style="font-size:16px;line-height:1.6">Your order <strong>#${orderNumber(order)}</strong> has been received and is awaiting confirmation.</p>`;
    return sendOrderEmailOnce(order, 'ORDER_PLACED', {
      preview: `Order #${orderNumber(order)} received`,
      heading: 'We received your order',
      subject: `Order #${orderNumber(order)} received`,
      body: paymentBlock,
    });
  },
  paymentConfirmed(order) {
    return sendOrderEmailOnce(order, 'PAYMENT_CONFIRMED', {
      preview: `Payment confirmed for order #${orderNumber(order)}`,
      heading: 'Payment confirmed',
      subject: `Payment confirmed · Order #${orderNumber(order)}`,
      body: paymentBody(order),
    });
  },
  shipped(order) {
    const normalizedTrackingUrl = normalizeHttpUrl(order.trackingUrl);
    const safeTrackingUrl = normalizedTrackingUrl ? escapeHtml(normalizedTrackingUrl) : null;
    const tracking = safeTrackingUrl
      ? `<p><a href="${safeTrackingUrl}" style="display:inline-block;padding:12px 20px;background:#111;color:#fff;text-decoration:none">Track shipment</a></p>`
      : '';
    return sendOrderEmailOnce(order, 'SHIPPED', {
      preview: `Order #${orderNumber(order)} has shipped`,
      heading: 'Your order is on the way',
      subject: `Order #${orderNumber(order)} has shipped`,
      body: `<p style="font-size:16px;line-height:1.6">Carrier: <strong>${escapeHtml(order.carrier || 'Courier')}</strong><br>Tracking number: <strong>${escapeHtml(order.trackingNumber || 'Pending')}</strong></p>${tracking}`,
    });
  },
  delivered(order) {
    return sendOrderEmailOnce(order, 'DELIVERED', {
      preview: `Order #${orderNumber(order)} delivered`,
      heading: 'Delivered',
      subject: `Order #${orderNumber(order)} was delivered`,
      body: '<p style="font-size:16px;line-height:1.6">Your order has been marked as delivered. Thank you for shopping with us.</p>',
    });
  },
  cancelled(order) {
    return sendOrderEmailOnce(order, 'CANCELLED', {
      preview: `Order #${orderNumber(order)} cancelled`,
      heading: 'Order cancelled',
      subject: `Order #${orderNumber(order)} was cancelled`,
      body: '<p style="font-size:16px;line-height:1.6">This order has been cancelled and its reserved inventory has been released.</p>',
    });
  },
};

module.exports = { emailEvents };
