const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { verifyAppleTransaction } = require('./appleBilling');

const transaction = (data) => `e30.${Buffer.from(JSON.stringify(data)).toString('base64url')}.signature`;
const expiresDate = Date.now() + 60_000;

test('routes sandbox purchases to Apple sandbox and checks the verified transaction', async () => {
  const originalFetch = global.fetch;
  const originalEnv = {
    issuer: process.env.APPLE_APP_STORE_ISSUER_ID,
    key: process.env.APPLE_APP_STORE_KEY_ID,
    privateKey: process.env.APPLE_APP_STORE_PRIVATE_KEY,
  };
  const { privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  process.env.APPLE_APP_STORE_ISSUER_ID = 'test-issuer';
  process.env.APPLE_APP_STORE_KEY_ID = 'test-key';
  process.env.APPLE_APP_STORE_PRIVATE_KEY = privateKey.export({ type: 'pkcs8', format: 'pem' });
  const requested = [];
  global.fetch = async (url) => {
    requested.push(url);
    return { ok: true, json: async () => ({ signedTransactionInfo: transaction({
      transactionId: '123', environment: 'Sandbox', bundleId: 'com.merkuryorunge.app',
      productId: 'merkur_yorunge_ogrenci_aylik', expiresDate,
    }) }) };
  };

  try {
    const result = await verifyAppleTransaction(transaction({ transactionId: '123', environment: 'Sandbox' }));
    assert.equal(result.active, true);
    assert.match(requested[0], /^https:\/\/api\.storekit-sandbox\.apple\.com\/inApps\/v1\/transactions\/123$/);
    await assert.rejects(
      verifyAppleTransaction(transaction({ transactionId: 'different', environment: 'Sandbox' })),
      /eşleşmiyor/,
    );
  } finally {
    global.fetch = originalFetch;
    for (const [name, value] of [
      ['APPLE_APP_STORE_ISSUER_ID', originalEnv.issuer],
      ['APPLE_APP_STORE_KEY_ID', originalEnv.key],
      ['APPLE_APP_STORE_PRIVATE_KEY', originalEnv.privateKey],
    ]) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
  }
});
