const crypto = require('crypto');

const PACKAGE_NAME = process.env.GOOGLE_PLAY_PACKAGE_NAME || 'com.merkuryorunge.app';
const PRODUCT_ID = process.env.GOOGLE_PLAY_SUBSCRIPTION_PRODUCT_ID || 'merkur_yorunge_ogrenci';
const ALLOWED_BASE_PLANS = new Set([
  process.env.GOOGLE_PLAY_MONTHLY_BASE_PLAN_ID || 'aylik',
  process.env.GOOGLE_PLAY_YEARLY_BASE_PLAN_ID || 'yillik'
]);

let cachedAccessToken = null;
let cachedAccessTokenExpiresAt = 0;

const base64Url = value => Buffer.from(value).toString('base64url');

const isPlayBillingServerConfigured = () => Boolean(
  process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL &&
  process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_PRIVATE_KEY
);

const getGoogleAccessToken = async () => {
  if (!isPlayBillingServerConfigured()) {
    throw new Error('Google Play servis hesabı henüz yapılandırılmadı.');
  }

  if (cachedAccessToken && Date.now() < cachedAccessTokenExpiresAt - 60_000) {
    return cachedAccessToken;
  }

  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64Url(JSON.stringify({
    iss: process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL,
    scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  }));
  const unsignedToken = `${header}.${payload}`;
  const privateKey = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n');
  const signature = crypto.sign('RSA-SHA256', Buffer.from(unsignedToken), privateKey).toString('base64url');
  const assertion = `${unsignedToken}.${signature}`;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || 'Google Play erişim anahtarı alınamadı.');
  }

  cachedAccessToken = data.access_token;
  cachedAccessTokenExpiresAt = Date.now() + Number(data.expires_in || 3600) * 1000;
  return cachedAccessToken;
};

const playRequest = async (url, options = {}) => {
  const accessToken = await getGoogleAccessToken();
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message || 'Google Play abonelik doğrulaması başarısız oldu.');
  }
  return data;
};

const acknowledgeSubscription = async (purchaseToken, productId) => {
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(PACKAGE_NAME)}/purchases/subscriptions/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`;
  await playRequest(url, { method: 'POST', body: JSON.stringify({}) });
};

const verifySubscriptionPurchase = async ({ purchaseToken, expectedAccountId }) => {
  if (!purchaseToken) throw new Error('Satın alma anahtarı eksik.');

  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(PACKAGE_NAME)}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`;
  const purchase = await playRequest(url);
  const accountId = purchase.externalAccountIdentifiers?.obfuscatedExternalAccountId;
  if (!accountId || accountId !== expectedAccountId) {
    throw new Error('Satın alma bu öğrenci hesabıyla eşleşmiyor.');
  }

  const lineItem = (purchase.lineItems || []).find(item => item.productId === PRODUCT_ID);
  if (!lineItem) throw new Error('Satın alınan abonelik ürünü geçersiz.');

  const basePlanId = lineItem.offerDetails?.basePlanId || null;
  if (basePlanId && !ALLOWED_BASE_PLANS.has(basePlanId)) {
    throw new Error('Satın alınan abonelik planı geçersiz.');
  }

  const expiresAt = lineItem.expiryTime ? new Date(lineItem.expiryTime) : null;
  const entitledStates = new Set([
    'SUBSCRIPTION_STATE_ACTIVE',
    'SUBSCRIPTION_STATE_IN_GRACE_PERIOD',
    'SUBSCRIPTION_STATE_CANCELED'
  ]);
  const active = entitledStates.has(purchase.subscriptionState) && expiresAt && expiresAt.getTime() > Date.now();

  if (active && purchase.acknowledgementState === 'ACKNOWLEDGEMENT_STATE_PENDING') {
    await acknowledgeSubscription(purchaseToken, PRODUCT_ID);
  }

  return {
    active,
    state: purchase.subscriptionState || 'SUBSCRIPTION_STATE_UNSPECIFIED',
    productId: PRODUCT_ID,
    basePlanId,
    expiresAt: expiresAt?.toISOString() || null,
    orderId: purchase.latestOrderId || null,
    raw: purchase
  };
};

module.exports = {
  PRODUCT_ID,
  PACKAGE_NAME,
  isPlayBillingServerConfigured,
  verifySubscriptionPurchase
};
