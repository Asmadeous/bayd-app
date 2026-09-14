package ca.baydspa.staff

import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.squareup.sdk.mobilepayments.MobilePaymentsSdk
import com.squareup.sdk.mobilepayments.core.Result.Failure
import com.squareup.sdk.mobilepayments.core.Result.Success
import com.squareup.sdk.mobilepayments.payment.CurrencyCode
import com.squareup.sdk.mobilepayments.payment.Money
import com.squareup.sdk.mobilepayments.payment.Payment.OfflinePayment
import com.squareup.sdk.mobilepayments.payment.Payment.OnlinePayment
import com.squareup.sdk.mobilepayments.payment.PaymentParameters
import com.squareup.sdk.mobilepayments.payment.ProcessingMode
import com.squareup.sdk.mobilepayments.payment.PromptMode
import com.squareup.sdk.mobilepayments.payment.PromptParameters
import java.util.UUID

// Native bridge to the Square Mobile Payments SDK — Tap to Pay on the phone's own
// NFC, no external reader. Mirrors lib/native/square-pos.ts. Signatures follow
// Square's Android docs + Kotlin sample (SDK 2.6.x):
//   developer.squareup.com/docs/mobile-payments-sdk/android
//   github.com/square/mobile-payments-sdk-android (example app)
//
// DEVICE + ACCOUNT GATED: works only on a Tap-to-Pay-eligible Android device
// (NFC, API 28+, Square-supported model) with a Square account that has Tap to
// Pay enabled. It cannot run on an emulator. The SDK is initialized in the
// Application subclass (SquarePosApp); isReady() reports false where it can't
// run, so the JS side falls back to a payment link instead of crashing.
@CapacitorPlugin(name = "SquarePos")
class SquarePosPlugin : Plugin() {

    @PluginMethod
    fun isReady(call: PluginCall) {
        val ret = JSObject()
        if (SquarePosApp.sdkInitialized) {
            ret.put("ready", true)
        } else {
            ret.put("ready", false)
            ret.put("reason", "Square Tap to Pay isn't set up on this device.")
        }
        call.resolve(ret)
    }

    @PluginMethod
    fun authorize(call: PluginCall) {
        val accessToken = call.getString("accessToken").orEmpty()
        val locationId = call.getString("locationId").orEmpty()
        if (accessToken.isBlank() || locationId.isBlank()) {
            call.reject("accessToken and locationId are required")
            return
        }

        val authManager = MobilePaymentsSdk.authorizationManager()
        if (authManager.authorizationState.isAuthorized) {
            call.resolve(JSObject().put("authorized", true))
            return
        }

        authManager.authorize(accessToken, locationId) { result ->
            when (result) {
                is Success -> call.resolve(JSObject().put("authorized", true))
                is Failure -> call.reject("Authorization failed: ${result.errorCode}-${result.errorMessage}")
            }
        }
    }

    @PluginMethod
    fun chargeTapToPay(call: PluginCall) {
        val amountCents = call.getInt("amountCents") ?: 0
        if (amountCents <= 0) {
            call.reject("A positive amountCents is required")
            return
        }
        val currency = when (call.getString("currency", "CAD")) {
            "USD" -> CurrencyCode.USD
            else -> CurrencyCode.CAD
        }
        val note = call.getString("note")

        val paymentParams = PaymentParameters.Builder(
            amount = Money(amountCents.toLong(), currency),
            processingMode = ProcessingMode.AUTO_DETECT,
            allowCardSurcharge = false,
            paymentAttemptId = UUID.randomUUID().toString(),
        ).apply {
            if (!note.isNullOrBlank()) note(note)
        }.autocomplete(true).build()

        val promptParams = PromptParameters(mode = PromptMode.DEFAULT)

        activity.runOnUiThread {
            MobilePaymentsSdk.paymentManager().startPaymentActivity(paymentParams, promptParams) { result ->
                when (result) {
                    is Success -> {
                        val id = when (val payment = result.value) {
                            is OnlinePayment -> payment.id
                            is OfflinePayment -> payment.localId
                        }
                        call.resolve(JSObject().put("paymentId", id).put("status", "COMPLETED"))
                    }
                    is Failure -> call.reject("Payment failed: ${result.errorCode}-${result.errorMessage}")
                }
            }
        }
    }
}
