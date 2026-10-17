import { Capacitor, registerPlugin } from '@capacitor/core';

export const BILLING_PRODUCT_ID = 'merkur_yorunge_ogrenci';
export const MONTHLY_PLAN_ID = 'aylik';
export const YEARLY_PLAN_ID = 'yillik';

const PlayBilling = registerPlugin('PlayBilling');

export const isNativePlayBilling = () => Capacitor.getPlatform() === 'android';

export const loadSubscriptionPlans = () => PlayBilling.getProducts({ productId: BILLING_PRODUCT_ID });

export const purchaseSubscription = (basePlanId, accountId) =>
  PlayBilling.purchase({ productId: BILLING_PRODUCT_ID, basePlanId, accountId });

export const restoreSubscriptionPurchases = () => PlayBilling.restorePurchases();

export const onPurchaseUpdated = callback => PlayBilling.addListener('purchaseUpdated', callback);
