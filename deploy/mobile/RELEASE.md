# Mobile app release pipeline (customer + staff)

Automated build -> sign -> upload for both apps, both platforms, via
`.github/workflows/mobile-release.yml` (fastlane under the hood). Admin is
web-only and has no store pipeline.

- **Android** -> Google Play (Internal testing track -> Production)
- **iOS** -> App Store Connect (TestFlight -> App Store)

The workflow is **manual** (`workflow_dispatch`): you pick app, platform, and
track. Production uploads a build but never auto-submits for review - you promote
it in the store console. Version numbers come from the CI run number, so you
never hand-edit gradle/Xcode.

---

## One-time setup (do this once, then releases are one click)

Everything below is credentials only YOU can create. Add each as a GitHub repo
secret (Settings -> Secrets and variables -> Actions). Nothing sensitive is
committed to the repo.

### 1. Android signing keystore

Generate one upload keystore (used for BOTH apps):

```bash
keytool -genkey -v -keystore bayd-release.keystore \
  -alias bayd -keyalg RSA -keysize 2048 -validity 10000
```

Then set these secrets:

| Secret | Value |
|---|---|
| `BAYD_KEYSTORE_BASE64` | `base64 -w0 bayd-release.keystore` (the whole file, base64) |
| `BAYD_KEYSTORE_PASSWORD` | the store password you chose |
| `BAYD_KEY_ALIAS` | `bayd` |
| `BAYD_KEY_PASSWORD` | the key password you chose |

> Keep `bayd-release.keystore` somewhere safe and backed up. If you lose it you
> can never update the apps under the same signing identity.

### 2. Google Play API access

1. Create both apps in Play Console (`ca.baydspa.customer`, `ca.baydspa.staff`).
2. Play Console -> Setup -> API access -> link a Google Cloud project ->
   create a **service account** -> grant it "Release manager" -> download its
   JSON key.
3. Secret: `PLAY_SERVICE_ACCOUNT_JSON` = the entire JSON.

### 3. Firebase config per app (push)

`google-services.json` is not committed (it holds the client API key). CI writes
it from a base64 secret so builds get push:

| Secret | Value |
|---|---|
| `GOOGLE_SERVICES_CUSTOMER_BASE64` | `base64 -w0` of the customer `google-services.json` (from the `bayd-spa` Firebase project) |
| `GOOGLE_SERVICES_STAFF_BASE64` | `base64 -w0` of the staff `google-services.json` |

### 4. Apple - App Store Connect API key

1. App Store Connect -> Users and Access -> Integrations -> App Store Connect
   API -> generate a key with **App Manager** role -> download the `.p8` (once!).
2. Set:

| Secret | Value |
|---|---|
| `ASC_KEY_ID` | the key id shown next to the key |
| `ASC_ISSUER_ID` | the issuer id at the top of the Keys page |
| `ASC_KEY_CONTENT_BASE64` | `base64 -w0 AuthKey_XXXX.p8` |

3. Create both apps in App Store Connect (bundle ids `ca.baydspa.customer`,
   `ca.baydspa.staff`), and register those bundle ids in the Apple Developer
   portal with the Push Notifications capability.

### 5. iOS signing - fastlane match

`match` stores signing certs + provisioning profiles encrypted in a **private
git repo**, so CI can sign headlessly.

1. Create an empty **private** git repo, e.g. `github.com/Asmadeous/bayd-match`.
2. Locally, once (needs the ASC key env from step 4 set):
   ```bash
   cd client
   bundle install
   MATCH_GIT_URL=git@github.com:Asmadeous/bayd-match.git \
     bundle exec fastlane match appstore
   ```
   This creates the certs/profiles for both bundle ids and pushes them encrypted.
3. Set:

| Secret | Value |
|---|---|
| `MATCH_GIT_URL` | the match repo URL (https form for CI, e.g. `https://github.com/Asmadeous/bayd-match.git`) |
| `MATCH_PASSWORD` | the passphrase you set when running match |
| `MATCH_GIT_BASIC_AUTH` | `base64 -w0` of `x-access-token:<a GitHub PAT with repo read on the match repo>` |

### 6. Square (staff Tap to Pay, baked at build)

| Secret | Value |
|---|---|
| `SQUARE_APPLICATION_ID` | your Square app id (sandbox for testing, production later) |

---

## Deploying

### To TEST (internal testers / TestFlight)

GitHub -> Actions -> **Mobile release** -> Run workflow:
- **app:** customer (or staff)
- **platform:** both (or android / ios)
- **track:** test

Result:
- **Android** -> Play **Internal testing** as a draft. In Play Console, add
  testers (Internal testing -> Testers) and share the opt-in link.
- **iOS** -> **TestFlight**. Add testers in App Store Connect -> TestFlight.
  (First upload of a new app can take ~an hour to process before it appears.)

Run it once per app (customer, then staff).

### To PRODUCTION

Same workflow, **track: production**. This uploads the build to the production
track but does NOT submit it. Then, in the store console:

- **Play Console** -> Production -> review the release -> **Roll out to
  production** (choose staged % if you want).
- **App Store Connect** -> your app -> the build -> add it to a new version ->
  fill "What's New" -> **Submit for Review**.

Store review (especially Apple, ~1-2 days) happens after you submit. Nothing goes
live to users without your explicit promote + Apple's approval.

---

## Before the FIRST production release, per store

These are store-listing requirements the pipeline can't fill for you:

- App name, subtitle, description, keywords
- Screenshots (per device size)
- App icon (1024px - already in the project)
- Privacy policy URL + data-safety / privacy questionnaire
- Content rating questionnaire
- (iOS) demo login for the reviewer - staff app needs a test staff account

## Notes / gotchas

- **Square is on SANDBOX** in secrets right now. Swap `SQUARE_APPLICATION_ID`
  (and the backend Square secrets) to production before a real production
  release, or POS runs in test mode. See the memory note.
- **App Links** (`deploy/mobile/assetlinks.*.json`) currently carry the DEBUG
  SHA-256. After generating the release keystore (step 1), add its SHA-256 to
  each file and redeploy them to `/.well-known/assetlinks.json`. Get it with:
  `keytool -list -v -keystore bayd-release.keystore -alias bayd`.
- Installed apps ship the web bundle offline. A backend deploy does NOT update
  them - only a new store release does.
- iOS CI runs on a **macOS** runner (billed ~10x Linux minutes). Only trigger iOS
  when you actually need a build.
