const crypto = require('crypto');

process.env.SAFEPAY_WEBHOOK_SECRET = 'launch-sprint-current-test-secret';
process.env.SAFEPAY_WEBHOOK_SECRET_PREVIOUS = 'launch-sprint-previous-test-secret';

const {
  parseSafepayWebhook,
  toLowestDenomination,
  verifySafepayWebhook,
} = require('../apps/backend/src/safepay');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const payload = {
  token: 'event_test_123',
  type: 'payment.succeeded',
  merchant_api_key: 'sec_test_public',
  data: {
    tracker: 'track_test_123',
    state: 'TRACKER_ENDED',
    amount: 280000,
    balance: 280000,
    currency: 'PKR',
    metadata: { order_id: '11111111-1111-4111-8111-111111111111' },
  },
};

const raw = Buffer.from(JSON.stringify(payload));
const currentSignature = crypto
  .createHmac('sha512', process.env.SAFEPAY_WEBHOOK_SECRET)
  .update(raw)
  .digest('hex');
const previousSignature = crypto
  .createHmac('sha512', process.env.SAFEPAY_WEBHOOK_SECRET_PREVIOUS)
  .update(raw)
  .digest('hex');

assert(verifySafepayWebhook(raw, currentSignature, payload), 'Current webhook secret was rejected.');
assert(verifySafepayWebhook(raw, `sha512=${currentSignature}`, payload), 'Prefixed signature was rejected.');
assert(verifySafepayWebhook(raw, previousSignature, payload), 'Previous rotation secret was rejected.');
assert(!verifySafepayWebhook(raw, '00'.repeat(64), payload), 'An invalid signature was accepted.');

const event = parseSafepayWebhook(payload);
assert(event.outcome === 'PAID', 'Successful payment event was not parsed as PAID.');
assert(event.amountMinor === '280000', 'Payment amount was parsed incorrectly.');
assert(event.currency === 'PKR', 'Payment currency was parsed incorrectly.');
assert(event.orderId === payload.data.metadata.order_id, 'Order metadata was parsed incorrectly.');

const amountCases = [
  ['1', 100],
  ['1.2', 120],
  ['1.23', 123],
  ['1.2300', 123],
  ['2500', 250000],
];
for (const [input, expected] of amountCases) {
  assert(toLowestDenomination(input) === expected, `Amount conversion failed for ${input}.`);
}

let precisionRejected = false;
try {
  toLowestDenomination('1.234');
} catch {
  precisionRejected = true;
}
assert(precisionRejected, 'An amount with unsupported precision was accepted.');

console.log('Launch-sprint Safepay signature, payload, rotation, and amount tests passed.');
