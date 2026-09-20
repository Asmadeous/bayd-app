# Adding Square Tap to Pay back to the staff app

Tap to Pay (in-person card payments on the tech's own phone via NFC, no external
reader) was **built, then removed**. This is the guide to putting it back.

> **Why it was removed.** Commit `fd3b33e` replaced `TapToPayButton` with
> `ChargeCardButton`, which opens Square's hosted checkout. From that point
> nothing called the native path: `useTapToPay` had no importers. The code kept
> shipping anyway, because `SquarePosPlugin.swift` imported the SDK, so every
> staff build embedded a **96 MB** `SquareMobilePaymentsSDK.framework` (of a
> 112 MB app) plus an NFC usage string, a Bluetooth usage string, a Tap to Pay
> entitlement, and an Android `minSdk 28` floor, all for a capability the app did
> not offer. Removing it took the staff app to **16 MB**.

## What is still in the tree

The **entire server side survived the removal**. Do not rebuild it.

| Thing | Where | State |
| --- | --- | --- |
| `GET /employee/pos/config` | `employees_controller.rb:180` | works |
| `POST /employee/bookings/:id/pos_payment` | `employees_controller.rb:201` | works |
| Payment re-verification | `employees_controller.rb:344` (`pos_payment_valid?`) | works |
| `SquareService.pos_access_token` | `square_service.rb:260` | works |
| Request spec | `spec/requests/api/v1/employee_pos_payment_spec.rb` | green |

The server never trusts the client's word that a payment happened: it re-verifies
the `paymentId` with Square (real, cleared, correct amount) before
`mark_paid!`. Charging is gated behind clock-in like every other staff charge.

## Recovering the deleted code

Everything removed, plus unfinished improvements that were never reachable, is on
branch `archive/tap-to-pay-wip`, commit **`00b196a`**.

```bash
git show 00b196a --stat
git show 00b196a:client/ios-employee/App/App/SquarePosPlugin.swift
```

That commit is worth reading before you write anything new. It contains four
fixes that cost real time to find:

1. **Link the merchant's Apple Account first.** Tap to Pay is unavailable until
   the merchant links their Square account to an Apple Account, which is how
   Apple's terms get accepted. Calling `startPayment` before that fails the whole
   attempt with `PaymentError.unsupportedMode`. Call
   `settings.isAppleAccountLinked`, then `settings.linkAppleAccount` and let
   Square present its own terms sheet.
2. **Ask for `.tapToPay`, not `.all`.** `.all` bundles keyed entry and cash, and
   offering a method the seller is not configured for makes the SDK reject the
   attempt outright rather than just hiding that option.
3. **Guard against a second concurrent `startPayment`.** It fails with
   `unsupportedMode` (code 13), so a double tap loses the payment instead of
   being ignored. Guard on both sides: a `pendingCall` marker natively, and a
   `useRef` in the hook, because `setBusy` is async and two quick taps both pass
   a `busy` check.
4. **Log the `NSError` domain, code and `userInfo`.** Square's
   `localizedDescription` only says "contact the developer".

## iOS re-integration

### 1. The plugin must be registered manually

Capacitor only instantiates plugins named in `capacitor.config.json`'s
`packageClassList`, and `cap sync` rebuilds that list from `node_modules` alone.
A plugin whose source lives in the app target is **never** in it. Compiling the
class and declaring `CAP_PLUGIN` is not enough.

`BridgeViewController.swift` already exists for exactly this (it registers
`BackgroundLocationPlugin`). Add one line:

```swift
override open func capacitorDidLoad() {
    bridge?.registerPluginInstance(BackgroundLocationPlugin())
    bridge?.registerPluginInstance(SquarePosPlugin())
}
```

> Use `registerPluginInstance`, **not** `registerPluginType`. The latter begins
> with `if autoRegisterPlugins { return }`, and `autoRegisterPlugins` is on by
> default, so it silently does nothing. This one costs an afternoon.

`SceneDelegate` must keep using `BridgeViewController()` rather than
`CAPBridgeViewController()`, or none of it runs.

### 2. The Apple entitlement is restricted

Apple granted `com.apple.developer.proximity-reader.payment.acceptance` to team
`HFZWQ3G4MV` on 2026-09-15 under the **development distribution restriction**
(**Case-ID 22222435**): registered test devices only, until the required video
recordings and App Review checklist are accepted.

While that restriction stands:

- The key goes in **`AppDebug.entitlements`** (Debug builds, on-device testing).
- It must **not** go in `App.entitlements`. An App Store provisioning profile
  cannot carry it, and declaring it there **fails the archive outright**.
- Move it to `App.entitlements` only once Apple lifts the restriction.

Issue the development profile with `bundle exec fastlane ios dev_certs app:staff`.
Use `force: true`: an existing profile is never rewritten in place, so a newly
granted capability only appears in a freshly issued one.

### 3. Build settings

- **SPM package:** add `https://github.com/square/mobile-payments-sdk-ios` to the
  **App target** (product `SquareMobilePaymentsSDK`). Do **not** add it to
  `CapApp-SPM/Package.swift`, which is CLI-managed and overwritten by `cap sync`.
- **Deployment target:** the SDK's own `Package.swift` declares `.iOS("16.0")`,
  and Tap to Pay needs iPhone XS or newer on iOS 16.7+. The staff app currently
  targets **15.0**, so raise `IPHONEOS_DEPLOYMENT_TARGET` to at least 16.0. It
  will build without this and fail on a real iOS 15 device.
- **App id:** `Info.plist` reads `SquareApplicationID` from
  `$(SQUARE_APPLICATION_ID)`. Xcode does not read `.env` files, so this comes from
  an `.xcconfig` (there was a `Square.xcconfig`) wired via the App **project** ->
  Info -> Configurations.

> **The xcconfig trap.** `Square.xcconfig` was the `baseConfigurationReference`
> for **both** Debug and Release on the App target. If you add an xcconfig and
> later delete the file without first clearing those two references, the project
> will not open. Removing them is why the App target now has no base xcconfig.

- **Info.plist keys** to restore: `NFCReaderUsageDescription` and
  `NSBluetoothAlwaysUsageDescription`. Camera, mic and location are already there.
- **Privacy manifest:** `PrivacyInfo.xcprivacy` needed no Square-specific rows and
  still does not. Check current App Store requirements before assuming that holds.

### 4. The nested-framework unpack phase

Square ships `CorePaymentCard`, `LCRCore` and `SquareReader` nested **inside**
`SquareMobilePaymentsSDK.framework`. App Store validation rejects nested bundles
(errors 90205 / 90206), so Square provides a setup script that hoists them into
the app's `Frameworks` directory.

- It **must be the last build phase**, after embedding.
- Square's script runs under `set -e` and ends on an "is this an archive" test, so
  it reports failure on a plain build and **breaks the simulator**. Guard it:

```sh
if [ "${EFFECTIVE_PLATFORM_NAME}" = "-iphonesimulator" ]; then
  echo "note: skipping Square framework unpack for the simulator"
  exit 0
fi
FRAMEWORKS="${BUILT_PRODUCTS_DIR}/${FRAMEWORKS_FOLDER_PATH}"
"${FRAMEWORKS}/SquareMobilePaymentsSDK.framework/setup"
```

- Give the phase declared outputs, or Xcode warns that it runs on every build.

## Android re-integration

- **SDK:** `com.squareup.sdk:mobile-payments-sdk:2.6.1`, from Square's Maven
  (`https://sdk.squareup.com/public/android/`), added to `allprojects`
  repositories in the root `build.gradle`.
- **Kotlin:** the plugin was the staff module's only Kotlin. Re-adding it means
  restoring `apply plugin: 'org.jetbrains.kotlin.android'`, the
  `kotlin-gradle-plugin` classpath (>= the version the SDK was built with; 2.6.1
  ships Kotlin 2.3 metadata), and `kotlinOptions { jvmTarget = "21" }` matching
  the Java target Capacitor uses, or `compileDebugKotlin` fails JVM-target
  validation.
- **minSdk:** the SDK needs API 28, above the shared 24 in `variables.gradle`.
  Re-adding it **drops support for API 24-27 devices**.
- **App id:** `build.gradle` exposed it as a `square_application_id` string
  resource that `SquarePosApp` (an `Application` subclass registered via
  `android:name` in the manifest) passed to `MobilePaymentsSdk.initialize`.
- **Manifest:** `android.permission.NFC` plus `android.hardware.nfc` and
  `android.hardware.nfc.hce` as `required="false"`, so the app still installs on
  phones that cannot do Tap to Pay.
- **Registration:** `MainActivity.onCreate` called
  `registerPlugin(SquarePosPlugin.class)` **before** `super.onCreate`.

## Release pipeline

`SQUARE_APPLICATION_ID` was a GitHub secret injected at build time into both
platforms (`mobile-release.yml` env, plus Fastfile `xcargs` for iOS and a gradle
property for Android). All of that was removed. Re-adding Tap to Pay means
restoring the secret and those injection points, and documenting it again in
`deploy/mobile/RELEASE.md`.

An `.xcconfig` value can only be overridden on the `xcodebuild` command line, not
by the environment, which is why the iOS side went through `xcargs`.

## Before you ship it

- **Device gating:** Tap to Pay does not run on a simulator or emulator. The tap
  handshake is verified on real, eligible hardware, by a human, not in CI.
- **Square dashboard:** Tap to Pay must be enabled on the account (Square
  approval, eligible device; not all accounts qualify).
- **Open security decision, still unresolved.** `GET /employee/pos/config`
  returns the account `SQUARE_ACCESS_TOKEN` so the device can authorize the SDK.
  That is Square's single-merchant model, and the endpoint is staff-authenticated
  and TLS-only, but a long-lived account token on every tech's phone is a real
  exposure. Consider minting a short-lived, payments-scoped OAuth token per
  device instead (change `SquareService.pos_access_token`). **Decide this before
  production, not after.**
- **Sandbox vs production:** the app id must match the environment of the access
  token and location the backend uses. Sandbox ids start with `sandbox-sq0idb-`,
  production with `sq0idp-`.
