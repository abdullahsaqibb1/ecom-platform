const crypto = require('crypto');
const { AppError } = require('./errors');

const ENDPOINTS = {
  production: 'https://api.getsafepay.com',
  sandbox: 'https://sandbox.api.getsafepay.com',
};

function environmentName() {
  const environment = String(process.env.SAFEPAY_ENVIRONMENT || 'sandbox').trim().toLowerCase();
  if (!ENDPOINTS[environment]) {
    throw new AppError(500, 'SAFEPAY_ENVIRONMENT must be sandbox or production.');
  }
  return environment;
}

function checkoutConfig() {
  const environment = environmentName();
  const secretKey = process.env.SAFEPAY_SECRET_KEY?.trim();
  const apiKey = process.env.SAFEPAY_API_KEY?.trim();
  const intent = String(process.env.SAFEPAY_INTENT || 'CYBERSOURCE').trim().toUpperCase();

  if (!secretKey || !apiKey) {
    throw new AppError(
      503,
      'Safepay checkout is not configured. Add SAFEPAY_SECRET_KEY and SAFEPAY_API_KEY.',
    );
  }
  if (!['CYBERSOURCE', 'MPGS'].includes(intent)) {
    throw new AppError(500, 'SAFEPAY_INTENT must be CYBERSOURCE or MPGS.');
  }

  return {
    environment,
    host: ENDPOINTS[environment],
    secretKey,
    apiKey,
    intent,
  };
}

function webhookSecrets() {
  const current = process.env.SAFEPAY_WEBHOOK_SECRET?.trim();
  const previous = String(process.env.SAFEPAY_WEBHOOK_SECRET_PREVIOUS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const secrets = [current, ...previous].filter(Boolean);
  if (!secrets.length) {
    throw new AppError(503, 'Safepay webhooks are not configured. Add SAFEPAY_WEBHOOK_SECRET.');
  }
  return secrets;
}

function toLowestDenomination(value) {
  const raw = String(value).trim();
  const match = raw.match(/^([0-9]+)(?:\.([0-9]+))?$/);
  if (!match) throw new AppError(500, 'The order total cannot be converted for Safepay.');

  const fractional = match[2] || '';
  if (fractional.slice(2).replace(/0/g, '')) {
    throw new AppError(500, 'Safepay amounts support at most two decimal places.');
  }

  const minor = (BigInt(match[1]) * 100n) + BigInt((fractional + '00').slice(0, 2));
  if (minor <= 0n || minor > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new AppError(500, 'The order total is outside Safepay payment limits.');
  }
  return Number(minor);
}

function normalizeHexSignature(value) {
  return String(value || '').trim().replace(/^sha512=/i, '').toLowerCase();
}

function timingSafeHexEqual(left, right) {
  const normalizedLeft = normalizeHexSignature(left);
  const normalizedRight = normalizeHexSignature(right);
  if (!/^[0-9a-f]+$/i.test(normalizedLeft) || !/^[0-9a-f]+$/i.test(normalizedRight)) return false;

  const leftBuffer = Buffer.from(normalizedLeft, 'hex');
  const rightBuffer = Buffer.from(normalizedRight, 'hex');
  if (!leftBuffer.length || leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function payloadBuffer(rawBody, parsedBody) {
  if (Buffer.isBuffer(rawBody) && rawBody.length) return rawBody;
  if (typeof rawBody === 'string' && rawBody.length) return Buffer.from(rawBody);
  return Buffer.from(JSON.stringify(parsedBody ?? {}));
}

function verifySafepayWebhook(rawBody, signature, parsedBody) {
  if (!signature) return false;
  const payload = payloadBuffer(rawBody, parsedBody);
  return webhookSecrets().some((secret) => {
    const expected = crypto.createHmac('sha512', secret).update(payload).digest('hex');
    return timingSafeHexEqual(signature, expected);
  });
}

function providerErrorDetails(error) {
  const details = error?.response?.data || error?.raw || error?.details;
  if (!details || typeof details !== 'object') return undefined;
  return details;
}

async function createSafepayCheckout({ amount, orderId, cancelUrl, redirectUrl }) {
  const config = checkoutConfig();
  let safepay;
  try {
    // Safepay's published CommonJS SDK exports a factory function.
    // Requiring it lazily keeps manual-payment deployments from loading provider code.
    // eslint-disable-next-line global-require, import/no-extraneous-dependencies
    safepay = require('@sfpy/node-core')(config.secretKey, {
      authType: 'secret',
      host: config.host,
    });
  } catch (error) {
    throw new AppError(500, 'The Safepay SDK could not be loaded.', providerErrorDetails(error));
  }

  try {
    const sessionResponse = await safepay.payments.session.setup({
      merchant_api_key: config.apiKey,
      intent: config.intent,
      mode: 'payment',
      entry_mode: 'raw',
      currency: 'PKR',
      amount: toLowestDenomination(amount),
      metadata: {
        order_id: orderId,
        source: 'cosmictech-storefront',
      },
      include_fees: false,
    });

    const tracker = sessionResponse?.data?.tracker?.token;
    if (!tracker) {
      throw new AppError(502, 'Safepay did not return a payment tracker.', sessionResponse);
    }

    const passportResponse = await safepay.client.passport.create();
    const tbt = typeof passportResponse?.data === 'string'
      ? passportResponse.data
      : passportResponse?.data?.token;
    if (!tbt) {
      throw new AppError(502, 'Safepay did not return an authentication token.', passportResponse);
    }

    const generatedUrl = safepay.checkout.createCheckoutUrl({
      env: config.environment,
      tbt,
      tracker,
      source: 'hosted',
      order_id: orderId,
      cancel_url: cancelUrl,
      redirect_url: redirectUrl,
    });
    if (!generatedUrl || typeof generatedUrl !== 'string') {
      throw new AppError(502, 'Safepay did not return a checkout URL.');
    }

    return { tracker, checkoutUrl: generatedUrl };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      502,
      'Safepay could not initialize this payment.',
      providerErrorDetails(error),
    );
  }
}

function parseSafepayWebhook(body) {
  const data = body?.data && typeof body.data === 'object' ? body.data : {};
  const metadata = data.metadata && typeof data.metadata === 'object' ? data.metadata : {};
  const eventType = String(body?.type || 'unknown');

  let outcome = 'IGNORED';
  if (eventType === 'payment.succeeded') outcome = 'PAID';
  if (eventType === 'payment.failed') outcome = 'FAILED_ATTEMPT';
  if (eventType === 'payment.refunded') {
    outcome = Number(data.balance) === 0 ? 'REFUNDED' : 'PARTIAL_REFUND';
  }

  return {
    eventId: String(body?.token || `${data.tracker || 'unknown'}:${eventType}:${body?.created_at?.seconds || 'event'}`),
    eventType,
    merchantApiKey: body?.merchant_api_key ? String(body.merchant_api_key) : null,
    orderId: metadata.order_id ? String(metadata.order_id) : '',
    tracker: data.tracker ? String(data.tracker) : null,
    providerState: data.state ? String(data.state).toUpperCase() : null,
    outcome,
    amountMinor: data.amount == null ? null : String(data.amount),
    refundAmountMinor: data.refund_amount == null ? null : String(data.refund_amount),
    balanceMinor: data.balance == null ? null : String(data.balance),
    currency: data.currency ? String(data.currency).toUpperCase() : null,
    payload: body,
  };
}

module.exports = {
  createSafepayCheckout,
  parseSafepayWebhook,
  toLowestDenomination,
  verifySafepayWebhook,
};
