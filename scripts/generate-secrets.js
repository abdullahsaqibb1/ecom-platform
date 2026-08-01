const crypto = require('crypto');

function secret() {
  return crypto.randomBytes(48).toString('base64url');
}

console.log('JWT_CUSTOMER_SECRET=' + secret());
console.log('JWT_ADMIN_SECRET=' + secret());
