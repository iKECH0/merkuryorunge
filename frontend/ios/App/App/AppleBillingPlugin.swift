import Foundation
import StoreKit
import Capacitor

@objc(AppleBillingPlugin)
public class AppleBillingPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AppleBillingPlugin"
    public let jsName = "AppleBilling"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getProducts", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restorePurchases", returnType: CAPPluginReturnPromise)
    ]

    private let productIDs: Set<String> = [
        "merkur_yorunge_ogrenci_aylik",
        "merkur_yorunge_ogrenci_yillik"
    ]

    @objc func getProducts(_ call: CAPPluginCall) {
        Task {
            guard let products = try? await Product.products(for: productIDs) else {
                call.reject("APPLE_PRODUCTS_UNAVAILABLE")
                return
            }
            let payload = products.map { product in
                [
                    "productId": product.id,
                    "displayName": product.displayName,
                    "description": product.description,
                    "displayPrice": product.displayPrice,
                    "price": product.price.description
                ]
            }
            call.resolve(["products": payload])
        }
    }

    @objc func purchase(_ call: CAPPluginCall) {
        guard let productID = call.getString("productId"), productIDs.contains(productID) else {
            call.reject("APPLE_PRODUCT_INVALID")
            return
        }
        Task {
            guard let products = try? await Product.products(for: [productID]),
                  let product = products.first else {
                call.reject("APPLE_PRODUCT_NOT_FOUND")
                return
            }
            do {
                let result = try await product.purchase()
                switch result {
                case .success(let verification):
                    let transaction = try Self.verified(verification)
                    let signedTransaction = verification.jwsRepresentation
                    await transaction.finish()
                    self.notifyListeners("purchaseUpdated", data: [
                        "productId": transaction.productID,
                        "transactionId": String(transaction.id),
                        "originalTransactionId": String(transaction.originalID),
                        "signedTransaction": signedTransaction,
                        "state": 1
                    ])
                    call.resolve(["productId": transaction.productID, "signedTransaction": signedTransaction])
                case .userCancelled:
                    self.notifyListeners("purchaseError", data: ["code": "USER_CANCELED"])
                    call.reject("USER_CANCELED")
                case .pending:
                    self.notifyListeners("purchaseError", data: ["code": "PENDING"])
                    call.reject("PENDING")
                @unknown default:
                    call.reject("APPLE_PURCHASE_UNKNOWN")
                }
            } catch {
                self.notifyListeners("purchaseError", data: ["code": "APPLE_PURCHASE_ERROR", "message": error.localizedDescription])
                call.reject(error.localizedDescription)
            }
        }
    }

    @objc func restorePurchases(_ call: CAPPluginCall) {
        Task {
            do {
                try await AppStore.sync()
                var purchases: [[String: Any]] = []
                for await result in Transaction.currentEntitlements {
                    guard case .verified(let transaction) = result else { continue }
                    purchases.append([
                        "productId": transaction.productID,
                        "transactionId": String(transaction.id),
                        "originalTransactionId": String(transaction.originalID),
                        "signedTransaction": result.jwsRepresentation,
                        "state": 1
                    ])
                }
                call.resolve(["purchases": purchases])
            } catch {
                call.reject(error.localizedDescription)
            }
        }
    }

    private static func verified<T>(_ result: VerificationResult<T>) throws -> T {
        switch result {
        case .verified(let value): return value
        case .unverified: throw NSError(domain: "AppleBilling", code: 1, userInfo: [NSLocalizedDescriptionKey: "APPLE_TRANSACTION_UNVERIFIED"])
        }
    }
}
