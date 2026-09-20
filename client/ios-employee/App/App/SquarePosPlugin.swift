import Foundation
import UIKit
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

        // processingMode is required since SDK 2.5. onlineOnly refuses the payment
        // when there is no connectivity rather than deferring authorisation, so a
        // tech never leaves a job believing a card cleared when it has not.
        let params = PaymentParameters(
            paymentAttemptID: UUID().uuidString,
            amountMoney: Money(amount: UInt(amountCents), currency: currency),
            processingMode: .onlineOnly
        )
        // Shows up on the Square receipt and dashboard next to the charge.
        params.note = call.getString("note")

        // Ask for Tap to Pay only. `.all` also bundles keyed entry and cash, and
        // offering a method the seller is not configured for makes the SDK reject
        // the attempt outright rather than just hiding that option.
        let prompt = PromptParameters(mode: .default, additionalMethods: .tapToPay)

        DispatchQueue.main.async {
            // A second startPayment while one is already in flight makes the SDK
            // fail the whole attempt with PaymentError.unsupportedMode (13), so a
            // double tap loses the payment rather than being ignored. pendingCall
            // is the in-flight marker: it is cleared in every delegate callback.
            guard self.pendingCall == nil else {
                call.reject("A payment is already in progress. Finish or cancel it first.")
                return
            }
            guard let presenter = self.bridge?.viewController else {
                call.reject("No view controller to present the payment sheet")
                return
            }

            let settings = MobilePaymentsSDK.shared.readerManager.tapToPaySettings
            guard settings.isDeviceCapable else {
                call.reject("This iPhone can't take taps. Tap to Pay needs an iPhone XS or newer on iOS 16.7+.")
                return
            }

            // Tap to Pay is unavailable until the merchant links their Square
            // account to an Apple Account, which is how Apple's terms are
            // accepted. Starting a payment before that fails the whole attempt
            // with PaymentError.unsupportedMode, so link first and let Square
            // present its own terms sheet.
            settings.isAppleAccountLinked { linked, _ in
                DispatchQueue.main.async {
                    if linked {
                        self.start(params, prompt, presenter, call)
                    } else {
                        settings.linkAppleAccount { error in
                            DispatchQueue.main.async {
                                if let error {
                                    call.reject("Tap to Pay setup didn't finish: \(error.localizedDescription)")
                                } else {
                                    self.start(params, prompt, presenter, call)
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    private func start(_ params: PaymentParameters,
                       _ prompt: PromptParameters,
                       _ presenter: UIViewController,
                       _ call: CAPPluginCall) {
        pendingCall = call
        MobilePaymentsSDK.shared.paymentManager.startPayment(
            params,
            promptParameters: prompt,
            from: presenter,
            delegate: self
        )
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
        // Square's localizedDescription only says "contact the developer", so
        // carry the domain, code and underlying error through to the log: that is
        // the difference between diagnosing this and guessing at it.
        let ns = error as NSError
        let detail = "domain=\(ns.domain) code=\(ns.code) info=\(ns.userInfo)"
        pendingCall?.reject("Payment failed: \(error.localizedDescription) [\(detail)]")
        pendingCall = nil
    }

    public func paymentManager(_ paymentManager: PaymentManager, didCancel payment: Payment) {
        pendingCall?.reject("Payment canceled")
        pendingCall = nil
    }
}
