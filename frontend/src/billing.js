import { Capacitor, registerPlugin } from '@capacitor/core';

export const BILLING_PRODUCT_ID = 'merkur_yorunge_ogrenci';
export const MONTHLY_PLAN_ID = 'aylik';
export const YEARLY_PLAN_ID = 'yillik';
export const APPLE_MONTHLY_PRODUCT_ID = 'merkur_yorunge_ogrenci_aylik';
export const APPLE_YEARLY_PRODUCT_ID = 'merkur_yorunge_ogrenci_yillik';

const PlayBilling = registerPlugin('PlayBilling');
const AppleBilling = registerPlugin('AppleBilling');

export const isNativePlayBilling = () => Capacitor.getPlatform() === 'android';
export const isNativeAppleBilling = () => Capacitor.getPlatform() === 'ios';

export const loadSubscriptionPlans = () => PlayBilling.getProducts({ productId: BILLING_PRODUCT_ID });

export const purchaseSubscription = (basePlanId, accountId) =>
  PlayBilling.purchase({ productId: BILLING_PRODUCT_ID, basePlanId, accountId });

export const restoreSubscriptionPurchases = () => PlayBilling.restorePurchases();

export const acknowledgePurchase = purchaseToken => PlayBilling.acknowledgePurchase({ purchaseToken });

export const onPurchaseUpdated = callback => PlayBilling.addListener('purchaseUpdated', callback);
export const onPurchaseError = callback => PlayBilling.addListener('purchaseError', callback);

// StoreKit is deliberately isolated from Google Play Billing.
// The native AppleBilling plugin is required in the iOS build before purchase
// buttons are enabled; this prevents an iOS device from ever using Play Billing.
export const loadAppleSubscriptionPlans = () => AppleBilling.getProducts({
  productIds: [APPLE_MONTHLY_PRODUCT_ID, APPLE_YEARLY_PRODUCT_ID],
});
export const purchaseAppleSubscription = productId => AppleBilling.purchase({ productId });
export const restoreAppleSubscriptionPurchases = () => AppleBilling.restorePurchases();
export const onApplePurchaseUpdated = callback => AppleBilling.addListener('purchaseUpdated', callback);
export const onApplePurchaseError = callback => AppleBilling.addListener('purchaseError', callback);
