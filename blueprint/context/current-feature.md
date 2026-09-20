# Fix: Remove the Tap to Pay native POS path, document re-integration, modernize iOS release CI

**Type:** Fix
**Status:** built, pending final review

## The problem

Three separate problems, all in the staff app's release path.

**1. Tap to Pay is dead code that still ships.** Commit `fd3b33e` replaced
`TapToPayButton` with `ChargeCardButton` (hosted Square checkout). Nothing has
called the native path since:

- `useTapToPay` (`client/lib/hooks/use-tap-to-pay.ts`) has zero importers.
- `SquarePos` (`client/lib/native/square-pos.ts`) is referenced only by that hook.

The SDK is still compiled and embedded anyway, because `SquarePosPlugin.swift`
imports it and `AppDelegate` initializes it:

| Embedded framework | Size |
| --- | --- |
| SquareMobilePaymentsSDK | 96 MB |
| Capacitor | 4.1 MB |
| IONCameraLib | 1.8 MB |
| Cordova | 288 KB |

96 MB of a 112 MB debug binary, linked via
`@rpath/SquareMobilePaymentsSDK.framework`, for code nothing reaches. It also
drags along an NFC usage string, a Bluetooth usage string, a Tap to Pay
entitlement, Square rows in the privacy manifest, and an Android `minSdk 28`
floor - all of which App Review will ask about for a capability the app does not
offer.

**2. The iOS release CI cannot ship.** `.github/workflows/mobile-release.yml:104`
pins `runs-on: macos-14` with no Xcode pin, so it builds on Xcode 15.x. Apple has
required the iOS 18 SDK (Xcode 16+) for App Store submissions since April 2025,
and the floor rises yearly. `fastlane ios beta app:staff` produces an IPA that
App Store Connect rejects on upload. Local builds use Xcode 27, so CI compiles
something never tested here.

**3. Institutional knowledge is about to be deleted with the code.** The Tap to
Pay files carry hard-won detail: Apple Case-ID 22222435 and the development
distribution restriction, why the entitlement lives in `AppDebug.entitlements`
and not `App.entitlements`, the `registerPluginInstance` vs `registerPluginType`
gotcha, and Square's nested-framework unpack phase. Deleting the code without
capturing this means paying for it twice.

## The fix

Remove the **client** Tap to Pay path (iOS, Android, web shims) and replace
`docs/square-tap-to-pay.md` with a re-integration guide. Then fix the release
workflow.

**Decisions already made (do not revisit):**

| Decision | Choice |
| --- | --- |
| Backend `pos_payment` endpoint + spec | **Keep.** Zero binary cost, and it is the verification half. Document as already-present. |
| Android `minSdk` | Drop 28 back to the shared 24 (`variables.gradle`). |
| CI runner | `macos-14` to `macos-26`, plus an explicit Xcode pin. |
| Stale CI actions | `checkout@v4` to v5, `setup-node@v4` to v5. |
| CI toolchain | Node 22 to 24, Ruby 3.3 to 3.4. |
| Uncommitted Square WIP | Preserve on a throwaway branch first, reference the SHA in the guide. |

**Must not break:**

- **The web Square checkout stays.** `ChargeCardButton`, `BookingPaymentService#checkout_link`,
  `POST /employee/bookings/:id/payment_link`, `lib/native/open-external.ts`, and
  `lib/hooks/use-account.ts` card-on-file are the live payment path. Only the
  native POS plugin path goes.
- **All server-side Square stays.** `square_service.rb`, webhooks, tips,
  subscriptions, checkout are untouched.
- `BridgeViewController.swift` is **half load-bearing**. Its
  `BackgroundLocationPlugin()` registration is live (the staff location prompt
  depends on it). Only the `SquarePosPlugin()` line goes.
- `Square.xcconfig` is the `baseConfigurationReference` for **both** Debug and
  Release on the App target (`project.pbxproj:358,386`). Unwire those before
  deleting the file or the project will not open.

## Build steps

- [x] **Step 1 - Preserve the WIP** - commit the uncommitted Square changes
      (`SquarePosPlugin.swift` Apple Account linking, `use-tap-to-pay.ts`
      `inFlight` guard, `BridgeViewController.swift`, both `PrivacyInfo.xcprivacy`,
      both `project.pbxproj`) to a throwaway branch `archive/tap-to-pay-wip`, then
      return to the fix branch. Archived as `00b196a` on `archive/tap-to-pay-wip`.
      *Done when:* the branch exists with one commit,
      its SHA is recorded for the guide, and the fix branch working tree is clean
      of those changes.

- [x] **Step 2 - Remove the web shims** - delete `client/lib/hooks/use-tap-to-pay.ts`
      and `client/lib/native/square-pos.ts`. *Done when:* both files are gone, a
      repo-wide grep for `useTapToPay` and `SquarePos` returns nothing outside
      `docs/` and `android-employee/`, and `npx tsc --noEmit` plus `npm run lint`
      are green in `client/`.

- [x] **Step 3 - Remove the iOS native path** - in `client/ios-employee/App/`:
      delete `SquarePosPlugin.swift`, `SquarePosPlugin.m`, `Square.xcconfig`;
      strip the SDK import, `squareSdkInitialized`, and the init block from
      `AppDelegate.swift`; drop the `SquarePosPlugin()` line from
      `BridgeViewController.swift` (keep `BackgroundLocationPlugin()`); remove
      `NFCReaderUsageDescription`, `NSBluetoothAlwaysUsageDescription`, and
      `SquareApplicationID` from `Info.plist`; remove
      `com.apple.developer.proximity-reader.payment.acceptance` from
      `AppDebug.entitlements` and the Tap to Pay comment block from
      `App.entitlements`; drop the Square rows from `PrivacyInfo.xcprivacy`; and
      in `project.pbxproj` remove the two file refs, two build files, two Sources
      entries, the `Square SDK setup (unpack nested frameworks)` build phase, the
      `mobile-payments-sdk-ios` package ref and product dependency, and both
      `baseConfigurationReference` pointers to `Square.xcconfig`.
      *Done when:* `xcodebuild -scheme App -sdk iphonesimulator` succeeds with no
      Square references, the built `App.app/Frameworks` no longer contains
      `SquareMobilePaymentsSDK.framework`, the bundle is roughly 96 MB smaller,
      the `Run script build phase ... does not specify any outputs` warning is
      gone, and the staff app still launches to Schedule with a working location
      prompt.

- [x] **Step 4 - Remove the Android native path** - in `client/android-employee/`:
      delete `SquarePosApp.kt` and `SquarePosPlugin.kt`; remove
      `android:name=".SquarePosApp"` and the NFC feature/permission lines from
      `AndroidManifest.xml`; drop `registerPlugin(SquarePosPlugin.class)` from
      `MainActivity.java`; in `app/build.gradle` remove `minSdkVersion 28` so it
      inherits 24 from `variables.gradle`, plus the Square SDK dependency and the
      `square_application_id` `resValue`; remove the Square Maven repo from
      `build.gradle`, and the Kotlin plugin only if nothing else uses Kotlin.
      *Done when:* `./gradlew :app:assembleDebug` succeeds, the manifest declares
      no NFC, the merged manifest shows `minSdkVersion 24`, and a grep for
      `square` in `android-employee/` returns nothing.
      > **Gradle build NOT verified.** This machine has no Android SDK and no
      > Java runtime, so `assembleDebug` could not run. Verified statically only:
      > zero `square` references, manifest correct, `minSdkVersion` inherits 24.
      > Someone with the Android toolchain must confirm before an Android release.

- [x] **Step 5 - Fix the release workflow** - in
      `.github/workflows/mobile-release.yml`: `macos-14` to `macos-26`; add a
      `maxim-lobanov/setup-xcode@v1` step with `xcode-version: latest-stable`;
      `actions/checkout@v4` to v5 and `actions/setup-node@v4` to v5 in both jobs;
      Node `22` to `24`; Ruby `3.3` to `3.4`; drop `SQUARE_APPLICATION_ID` from
      both jobs' env and its line in the required-secrets header comment. In
      `client/fastlane/Fastfile` drop the `SQUARE_APPLICATION_ID` xcargs and
      gradle property, and rewrite the `dev_certs` lane comment that explains
      itself purely in Tap to Pay terms. Update the Square Tap to Pay credential
      rows in `deploy/mobile/RELEASE.md`. *Done when:* `actionlint` (or a YAML
      parse) is clean, no workflow or Fastfile line mentions
      `SQUARE_APPLICATION_ID`, and the Fastfile still parses
      (`bundle exec fastlane lanes`).

- [x] **Step 6 - Write the re-integration guide** - replace
      `docs/square-tap-to-pay.md` with a guide for adding Tap to Pay back, written
      as instructions rather than a description of a shipped feature. It must
      carry forward, at minimum:
      Apple Case-ID 22222435 and the development distribution restriction;
      why the entitlement belongs in `AppDebug.entitlements` and what has to
      change for `App.entitlements`; the `registerPluginInstance` vs
      `registerPluginType` gotcha (`autoRegisterPlugins` makes the latter a
      silent no-op); Square's nested-framework unpack build phase, why it must be
      last, and the simulator guard; the `Square.xcconfig` wiring and its
      `baseConfigurationReference` trap; Android `minSdk 28`; the 96 MB binary
      cost; that `POST /employee/bookings/:id/pos_payment` and its spec are still
      in the tree and need no rebuild; and the `archive/tap-to-pay-wip` SHA from
      Step 1 with a one-line note on what that WIP fixed.
      *Done when:* the guide reads as a from-scratch re-integration path, every
      item above appears, and no link points at a file this fix deleted.

## Verify

- `bundle exec rspec spec/requests/api/v1/employee_pos_payment_spec.rb` green,
  proving the kept backend still works.
- `bundle exec rspec` green overall; `bin/rubocop` and `bin/brakeman` clean.
- In `client/`: `npx tsc --noEmit` and `npm run lint` green.
- `npm run sync:mobile:employee`, then build and launch the staff app on the
  iPhone 17 Pro simulator: it reaches **Schedule**, the location prompt appears
  (proving `BackgroundLocationPlugin` survived), and **Charge card** on a booking
  still opens the hosted Square checkout.
- `du -sh App.app` shows roughly 16 MB rather than 112 MB.

## Notes for the AI

- Removing Tap to Pay is **not** removing Square. The backend and the hosted web
  checkout are the live payment path and must not be touched.
- Work `project.pbxproj` carefully and build after each edit: the Square entries
  span build files, file refs, the group, Sources, a build phase, the SPM package
  ref, the product dependency, and two `baseConfigurationReference` pointers.
- Do not delete `docs/square-tap-to-pay.md` and start blank. Read it first: parts
  of it become the guide.
