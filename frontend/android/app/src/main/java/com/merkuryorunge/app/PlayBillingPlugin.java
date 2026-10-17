package com.merkuryorunge.app;

import android.app.Activity;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@CapacitorPlugin(name = "PlayBilling")
public class PlayBillingPlugin extends Plugin {
    private BillingClient billingClient;
    private ProductDetails cachedProduct;

    @Override
    public void load() {
        billingClient = BillingClient.newBuilder(getContext())
            .setListener((billingResult, purchases) -> {
                if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK || purchases == null) return;
                for (com.android.billingclient.api.Purchase purchase : purchases) {
                    notifyListeners("purchaseUpdated", purchaseToJson(purchase));
                }
            })
            .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
            .build();
    }

    private void withConnection(PluginCall call, Runnable action) {
        if (billingClient.isReady()) {
            action.run();
            return;
        }
        billingClient.startConnection(new BillingClientStateListener() {
            @Override public void onBillingSetupFinished(BillingResult result) {
                if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) action.run();
                else call.reject("Google Play ödeme servisine bağlanılamadı: " + result.getDebugMessage());
            }
            @Override public void onBillingServiceDisconnected() {}
        });
    }

    @PluginMethod
    public void getProducts(PluginCall call) {
        String productId = call.getString("productId", "merkur_yorunge_ogrenci");
        withConnection(call, () -> {
            QueryProductDetailsParams.Product product = QueryProductDetailsParams.Product.newBuilder()
                .setProductId(productId)
                .setProductType(BillingClient.ProductType.SUBS)
                .build();
            QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
                .setProductList(Collections.singletonList(product))
                .build();
            billingClient.queryProductDetailsAsync(params, (result, queryResult) -> {
                if (result.getResponseCode() != BillingClient.BillingResponseCode.OK || queryResult.getProductDetailsList().isEmpty()) {
                    call.reject("Abonelik seçenekleri alınamadı: " + result.getDebugMessage());
                    return;
                }
                cachedProduct = queryResult.getProductDetailsList().get(0);
                JSArray plans = new JSArray();
                List<ProductDetails.SubscriptionOfferDetails> offers = cachedProduct.getSubscriptionOfferDetails();
                if (offers != null) for (ProductDetails.SubscriptionOfferDetails offer : offers) {
                    List<ProductDetails.PricingPhase> phases = offer.getPricingPhases().getPricingPhaseList();
                    if (phases.isEmpty()) continue;
                    ProductDetails.PricingPhase phase = phases.get(phases.size() - 1);
                    JSObject plan = new JSObject();
                    plan.put("basePlanId", offer.getBasePlanId());
                    plan.put("offerToken", offer.getOfferToken());
                    plan.put("formattedPrice", phase.getFormattedPrice());
                    plan.put("billingPeriod", phase.getBillingPeriod());
                    plans.put(plan);
                }
                JSObject response = new JSObject();
                response.put("productId", cachedProduct.getProductId());
                response.put("name", cachedProduct.getName());
                response.put("description", cachedProduct.getDescription());
                response.put("plans", plans);
                call.resolve(response);
            });
        });
    }

    @PluginMethod
    public void purchase(PluginCall call) {
        String basePlanId = call.getString("basePlanId");
        String accountId = call.getString("accountId");
        if (basePlanId == null || accountId == null) {
            call.reject("Paket ve öğrenci hesabı gereklidir.");
            return;
        }
        Runnable launch = () -> {
            if (cachedProduct == null || cachedProduct.getSubscriptionOfferDetails() == null) {
                call.reject("Önce abonelik seçeneklerini yükleyin.");
                return;
            }
            ProductDetails.SubscriptionOfferDetails selected = null;
            for (ProductDetails.SubscriptionOfferDetails offer : cachedProduct.getSubscriptionOfferDetails()) {
                if (basePlanId.equals(offer.getBasePlanId())) { selected = offer; break; }
            }
            if (selected == null) {
                call.reject("Seçilen paket bulunamadı.");
                return;
            }
            BillingFlowParams.ProductDetailsParams detailParams = BillingFlowParams.ProductDetailsParams.newBuilder()
                .setProductDetails(cachedProduct)
                .setOfferToken(selected.getOfferToken())
                .build();
            BillingFlowParams params = BillingFlowParams.newBuilder()
                .setProductDetailsParamsList(Collections.singletonList(detailParams))
                .setObfuscatedAccountId(sha256(accountId.trim().toLowerCase()))
                .build();
            Activity activity = getActivity();
            BillingResult result = billingClient.launchBillingFlow(activity, params);
            if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) call.resolve();
            else call.reject("Satın alma ekranı açılamadı: " + result.getDebugMessage());
        };
        withConnection(call, launch);
    }

    @PluginMethod
    public void restorePurchases(PluginCall call) {
        withConnection(call, () -> billingClient.queryPurchasesAsync(
            QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.SUBS).build(),
            (result, purchases) -> {
                if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                    call.reject("Satın almalar alınamadı: " + result.getDebugMessage());
                    return;
                }
                JSArray items = new JSArray();
                for (com.android.billingclient.api.Purchase purchase : purchases) items.put(purchaseToJson(purchase));
                JSObject response = new JSObject();
                response.put("purchases", items);
                call.resolve(response);
            }
        ));
    }

    private JSObject purchaseToJson(com.android.billingclient.api.Purchase purchase) {
        JSObject item = new JSObject();
        item.put("purchaseToken", purchase.getPurchaseToken());
        item.put("orderId", purchase.getOrderId());
        item.put("products", new JSArray(purchase.getProducts()));
        item.put("state", purchase.getPurchaseState());
        item.put("acknowledged", purchase.isAcknowledged());
        return item;
    }

    private String sha256(String value) {
        try {
            byte[] bytes = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder result = new StringBuilder();
            for (byte b : bytes) result.append(String.format("%02x", b));
            return result.toString();
        } catch (Exception exception) {
            throw new IllegalStateException(exception);
        }
    }

    @Override
    protected void handleOnDestroy() {
        if (billingClient != null && billingClient.isReady()) billingClient.endConnection();
    }
}
