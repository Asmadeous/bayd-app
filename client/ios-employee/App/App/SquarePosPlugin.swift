import Foundation
import Capacitor
import SquareMobilePaymentsSDK

// Native bridge to the Square Mobile Payments SDK (Tap to Pay on iPhone) — mirrors
// the Android SquarePosPlugin.kt and lib/native/square-pos.ts. Signatures follow
// Square's iOS docs + sample app (SDK 2.4.x):
//   developer.squareup.com/docs/mobile-payments-sdk/ios
//   github.com/square/mobile-payments-sdk-ios (DonutCounter example)
//
// DEVICE + ACCOUNT + ENTITLEMENT GATED: Tap to Pay on iPhone needs an iPhone XS
// or newer on iOS 16.7+, the Square account's Tap to Pay enabled, AND Apple's
// Tap to Pay on iPhone entitlement granted to the App ID. It cannot run in the
// simulator. isReady() reports false where it can't run, so the JS side falls
// back to a payment link.
//
// The SDK uses a delegate (PaymentManagerDelegate) rather than a callback, so we
// hold the pending Capacitor call and resolve/reject it from the delegate methods.
@objc(SquarePosPlugin)
public class SquarePosPlugin: CAPPlugin, PaymentManagerDelegate {

    private var pendingCall: CAPPluginCall?

    @objc func isReady(_ call: CAPPluginCall) {
        // The SDK is initialized in AppDelegate only when a Square application id
        // is configured; we track that ourselves (no public isInitialized query).
        if AppDelegate.squareSdkInitialized {
            call.resolve(["ready": true])
        } else {
            call.resolve(["ready": false, "reason": "Square Tap to Pay isn't set up on this device."])
        }
    }

    @objc func authorize(_ call: CAPPluginCall) {
        guard let accessToken = call.getString("accessToken"), !accessToken.isEmpty,
              let locationId = call.getString("locationId"), !locationId.isEmpty else {
            call.reject("accessToken and locationId are required")
            return
        }

        if MobilePaymentsSDK.shared.authorizationManager.state == .authorized {
            call.resolve(["authorized": true])
            return
        }

        MobilePaymentsSDK.shared.authorizationManager.authorize(
            withAccessToken: accessToken,
            locationID: locationId
        ) { error in
            if let error = error {
                call.reject("Authorization failed: \(error.localizedDescription)")
            } else {
                call.resolve(["authorized": true])
            }
        }
    }

    @objc func chargeTapToPay(_ call: CAPPluginCall) {
        let amountCents = call.getInt("amountCents") ?? 0
        guard amountCents > 0 else {
            call.reject("A positive amountCents is required")
            return
        }
        let currency: Currency = (call.getString("currency", "CAD") == "USD") ? .USD : .CAD

        let params = PaymentParameters(
            paymentAttemptID: UUID().uuidString,
            amountMoney: Money(amount: UInt(amountCents), currency: currency)
        )
        // Note: PaymentParameters has an optional `note` in the SDK, but its exact
        // Swift setter name isn't verified here (can't resolve the pod on Linux),
        // so it's omitted rather than guessed. The backend already labels the
        // charge (BKG-<id>) via the booking; add note on a Mac if wanted.

        // .all includes Tap to Pay on iPhone in Square's default prompt.
        let prompt = PromptParameters(mode: .default, additionalMethods: .all)

        DispatchQueue.main.async {
            guard let presenter = self.bridge?.viewController else {
                call.reject("No view controller to present the payment sheet")
                return
            }
            self.pendingCall = call
            MobilePaymentsSDK.shared.paymentManager.startPayment(
                params,
                promptParameters: prompt,
                from: presenter,
                delegate: self
            )
        }
    }

    // MARK: - PaymentManagerDelegate

    public func paymentManager(_ paymentManager: PaymentManager, didFinish payment: Payment) {
        let id = (payment as? OnlinePayment)?.id
            ?? (payment as? OfflinePayment)?.localID
            ?? ""
        pendingCall?.resolve(["paymentId": id, "status": "COMPLETED"])
        pendingCall = nil
    }

    public func paymentManager(_ paymentManager: PaymentManager, didFail payment: Payment, withError error: Error) {
        pendingCall?.reject("Payment failed: \(error.localizedDescription)")
        pendingCall = nil
    }

    public func paymentManager(_ paymentManager: PaymentManager, didCancel payment: Payment) {
        pendingCall?.reject("Payment canceled")
        pendingCall = nil
    }
}
