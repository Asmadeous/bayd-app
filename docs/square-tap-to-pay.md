# Square Tap to Pay (staff/admin POS)

In-person card payments on the staff app using the phone's own NFC (no external
reader), via Square's **Mobile Payments SDK**. The tech taps the customer's card
on their phone to settle a booking's balance.

## How it works

1. Staff app fetches `GET /api/v1/employee/pos/config` (app id, location id,
   environment, and the OAuth token the SDK needs).
2. The native plugin (`SquarePosPlugin.kt`) calls `MobilePaymentsSdk.authorize()`
   once, then `startPaymentActivity()` to present Square's tap sheet.
3. The tap clears **on the device**; the SDK returns a Square `paymentId`.
4. The app posts it to `POST /api/v1/employee/bookings/:id/pos_payment`, which
   **re-verifies the payment with Square** (real, cleared, correct amount) and
   records it against the booking (`mark_paid!`). The server never trusts the
   client's word that a payment happened.

Charging is gated behind clock-in, like every other staff charge.

## What you MUST set up (not done yet)

**Square dashboard**
- Enable **Tap to Pay on Android** on the Square account (Square approval + an
  eligible device; not all phones/accounts qualify).
- Note the **Application ID** and the **Location ID**.

**Environment variables** (server)
- `SQUARE_APPLICATION_ID` - the app id (also injected into the Android build).
- `SQUARE_LOCATION_ID` - already set.
- `SQUARE_ACCESS_TOKEN` - already set.
- `SQUARE_ENVIRONMENT` - `sandbox` or `production` (defaults to `sandbox`).

**Android build** (verified against Square's Android docs + sample app, SDK 2.6.1)
- `SQUARE_APPLICATION_ID` must be present in the environment at build time - the
  staff `build.gradle` exposes it as the `square_application_id` string resource,
  which `SquarePosApp` (the Application subclass) passes to
  `MobilePaymentsSdk.initialize(appId, this)`. Empty -> SDK stays uninitialized ->
  `isReady()` false -> the app hides Tap to Pay and falls back to a payment link.
- SDK dependency: `com.squareup.sdk:mobile-payments-sdk:2.6.1`, from Square's
  Maven (`https://sdk.squareup.com/public/android/`, added in the root
  `build.gradle` allprojects repositories).
- The staff app's `minSdk` is raised to 28 (SDK requirement).
- Kotlin is enabled on the staff module for the plugin (jvmTarget 17).

## iOS (staff app) — ready for a Mac, NOT built here

The iOS side is written but **cannot be compiled or tested on this Linux machine**
(iOS builds need macOS + Xcode). It follows Square's iOS docs + sample app
(SquareMobilePaymentsSDK, current pod 2.6.0):

- `SquarePosPlugin.swift` + `SquarePosPlugin.m` — the Capacitor plugin (isReady,
  authorize, chargeTapToPay), using the `PaymentManagerDelegate` protocol.
- `AppDelegate.swift` — `MobilePaymentsSDK.initialize(squareApplicationID:)` at
  launch, reading `SquareApplicationID` from Info.plist.
- `Info.plist` — adds `NSBluetoothAlwaysUsageDescription` and `SquareApplicationID`
  (`$(SQUARE_APPLICATION_ID)`); camera/mic/location already present.
- `App.entitlements` — the Tap to Pay entitlement
  `com.apple.developer.proximity-reader.payment.acceptance`.

**Manual steps you MUST do in Xcode on a Mac (I can't from here):**
1. Add the SPM package `https://github.com/square/mobile-payments-sdk-ios` to the
   **App target** (product `SquareMobilePaymentsSDK`), exact version. The
   Capacitor `CapApp-SPM/Package.swift` is CLI-managed — add the dependency to the
   App target in Xcode, not that file.
2. Set the App target's **Code Signing Entitlements** to `App/App.entitlements`.
3. Set `SQUARE_APPLICATION_ID` as a build setting / xcconfig so the Info.plist
   `$(SQUARE_APPLICATION_ID)` resolves.
4. Deployment target iOS 16+ (Tap to Pay needs iPhone XS+ on iOS 16.7+).

**Apple requirement:** the Tap to Pay entitlement is a **managed** entitlement —
request it for your Apple Developer team (developer.apple.com/tap-to-pay). Until
Apple approves production, it only works for **Development** builds; other
distribution types fail to sign.

**Two things I could not verify without a Mac/pod** (left conservative, not
guessed): the SDK's `PaymentParameters.note` setter name (omitted — the backend
already labels the charge), and any `isInitialized` query (tracked via a flag in
AppDelegate instead, same as Android).

## Device gating (why it can't be fully tested here)

Tap to Pay only runs on a **real, Tap-to-Pay-eligible Android phone** with NFC on
a Square-approved account. It does **not** run on an emulator. So the native tap
handshake is verified on-device by you, not in CI. Everything else (the backend
verify+record path, the UI gating, the config endpoint) is covered by specs and
typechecks.

## Open decision (security)

`GET /employee/pos/config` currently returns the account `SQUARE_ACCESS_TOKEN`
for the device to authorize the SDK. That is Square's single-merchant model, and
the endpoint is staff-authenticated + TLS-only. For tighter security, mint a
**short-lived, payments-scoped OAuth token per device** and return that instead
(change `SquareService.pos_access_token`). Decide before production.
