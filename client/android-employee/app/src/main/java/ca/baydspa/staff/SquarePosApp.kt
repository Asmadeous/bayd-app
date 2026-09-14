package ca.baydspa.staff

import android.app.Application
import com.squareup.sdk.mobilepayments.MobilePaymentsSdk

// Initializes the Square Mobile Payments SDK (Tap to Pay) once, at process start.
// Square requires initialize() in an Application subclass, with the Square
// application id + application context (per the Android docs / sample app).
//
// The app id comes from the `square_application_id` string resource, which the
// staff build.gradle sets from the SQUARE_APPLICATION_ID env var (empty by
// default). Empty id -> the SDK stays uninitialized -> SquarePosPlugin.isReady()
// returns false -> the app falls back to a payment link. Best-effort so a missing
// SDK/id never crashes app startup.
class SquarePosApp : Application() {
    companion object {
        // The SDK has no "is initialized?" query, so we track it ourselves. The
        // plugin's isReady() reads this to decide whether Tap to Pay can run.
        @Volatile
        var sdkInitialized: Boolean = false
            private set
    }

    override fun onCreate() {
        super.onCreate()
        val appId = getString(R.string.square_application_id)
        if (appId.isNotBlank()) {
            runCatching {
                MobilePaymentsSdk.initialize(appId, this)
                sdkInitialized = true
            }
        }
    }
}
