const crypto = require('crypto');

const BUNDLE_ID = process.env.APPLE_BUNDLE_ID || 'com.merkuryorunge.app';
const PRODUCT_IDS = new Set([
  process.env.APPLE_MONTHLY_PRODUCT_ID || 'merkur_yorunge_ogrenci_aylik',
  process.env.APPLE_YEARLY_PRODUCT_ID || 'merkur_yorunge_ogrenci_yillik'
]);

const base64Url = value => Buffer.from(value).toString('base64url');
const decodePayload = token => {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) throw new Error('Apple satın alma imzası geçersiz.');
  return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
};

const isAppleBillingServerConfigured = () => Boolean(
  process.env.APPLE_APP_STORE_ISSUER_ID &&
  process.env.APPLE_APP_STORE_KEY_ID &&
  process.env.APPLE_APP_STORE_PRIVATE_KEY
);

const createToken = () => {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'ES256', kid: process.env.APPLE_APP_STORE_KEY_ID, typ: 'JWT' }));
  const payload = base64Url(JSON.stringify({
    iss: process.env.APPLE_APP_STORE_ISSUER_ID,
    iat: now,
    exp: now + 300,
    aud: 'appstoreconnect-v1',
    bid: BUNDLE_ID
  }));
  const unsigned = `${header}.${payload}`;
  const key = process.env.APPLE_APP_STORE_PRIVATE_KEY.replace(/\\n/g, '\n');
  const signature = crypto.sign('sha256', Buffer.from(unsigned), { key, dsaEncoding: 'ieee-p1363' }).toString('base64url');
  return `${unsigned}.${signature}`;
};

const verifyAppleTransaction = async signedTransaction => {
  if (!isAppleBillingServerConfigured()) throw new Error('Apple App Store Server API henüz yapılandırılmadı.');
  const clientPayload = decodePayload(signedTransaction);
  const transactionId = String(clientPayload.transactionId || '').trim();
  if (!transactionId) throw new Error('Apple işlem kimliği bulunamadı.');

  const sandbox = clientPayload.environment === 'Sandbox';
  const host = sandbox ? 'api.storekit-sandbox.apple.com' : 'api.storekit.apple.com';
  const response = await fetch(`https://${host}/inApps/v1/transactions/${encodeURIComponent(transactionId)}`, {
    headers: { Authorization: `Bearer ${createToken()}` }
  });
  if (!response.ok) throw new Error(`Apple doğrulama servisi ${response.status} döndürdü.`);
  const data = await response.json();
  const transaction = decodePayload(data.signedTransactionInfo);
  if (String(transaction.transactionId) !== transactionId || !transaction.originalTransactionId || transaction.bundleId !== BUNDLE_ID || !PRODUCT_IDS.has(transaction.productId) || transaction.environment !== (sandbox ? 'Sandbox' : 'Production')) {
    throw new Error('Apple işlem ürünü veya uygulama ile eşleşmiyor.');
  }
  const expiresAt = Number(transaction.expiresDate || 0);
  const active = !transaction.revocationDate && expiresAt > Date.now();
  return {
    active, expiresAt: active ? new Date(expiresAt) : new Date(0), transactionId,
    originalTransactionId: String(transaction.originalTransactionId), productId: transaction.productId,
    priceMilliunits: transaction.environment === 'Production' && Number.isSafeInteger(transaction.price) ? transaction.price : null,
    currency: transaction.environment === 'Production' && /^[A-Z]{3}$/.test(transaction.currency || '') ? transaction.currency : null
  };
};

module.exports = { isAppleBillingServerConfigured, verifyAppleTransaction };
