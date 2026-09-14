# Mobile app hosts (m-*.baydspa.ca)

Each Capacitor app serves its WebView from a real per-app origin so third-party
embeds (HelcimPay) accept it - `https://localhost` is refused
(`ERR_BLOCKED_BY_RESPONSE`). Set in `client/capacitor.config.ts` (`server.hostname`).

| App | Package id | Host | Static dir on server |
|-----|-----------|------|----------------------|
| Customer | `ca.baydspa.customer` | `m-customer.baydspa.ca` | `/var/www/m-customer.baydspa.ca` |
| Staff    | `ca.baydspa.staff`    | `m-staff.baydspa.ca`    | `/var/www/m-staff.baydspa.ca` |
| Admin    | `ca.baydspa.admin`    | `m-admin.baydspa.ca`    | `/var/www/m-admin.baydspa.ca` |

## One-time setup

1. **DNS** - A records for `m-customer`, `m-staff`, `m-admin` .baydspa.ca -> server IP.
2. **Static dirs** - on the server: `sudo mkdir -p /var/www/m-{customer,staff,admin}.baydspa.ca`
3. **nginx** - the mobile server blocks are in `deploy/nginx.conf.example`; symlink/reload.
4. **TLS** - `sudo certbot --nginx -d m-customer.baydspa.ca -d m-staff.baydspa.ca -d m-admin.baydspa.ca --agree-tos -m admin@baydspa.ca --redirect`
5. **Asset links** - copy each `assetlinks.<app>.json` to
   `/var/www/m-<app>.baydspa.ca/.well-known/assetlinks.json`.

## Publishing a build

Per app (customer shown):
```bash
cd client
CAP_APP=customer MOBILE_API_URL=https://api.baydspa.ca/api/v1 \
  node scripts/build-mobile.mjs customer
rsync -az --delete out/ deploy@SERVER:/var/www/m-customer.baydspa.ca/
```
The APK itself still ships the bundle offline; the host only needs to exist for
the origin + asset-links association.

## Firebase / push notifications (google-services.json) - REQUIRED for push

Each app needs its OWN `google-services.json`, keyed to its exact package id.
There is NO shared file - the customer file registers only `ca.baydspa.customer`
and cannot be copied to the staff/admin projects.

| App | File location | Package to register in Firebase |
|-----|---------------|--------------------------------|
| Customer | `client/android/app/google-services.json` | `ca.baydspa.customer` |
| Staff    | `client/android-employee/app/google-services.json` | `ca.baydspa.staff` |
| Admin    | `client/android-admin/app/google-services.json` | `ca.baydspa.admin` |

**If the file is missing**, the `google-services` Gradle plugin is skipped and
the APK builds fine but PUSH NOTIFICATIONS SILENTLY DO NOT WORK. The build now
prints a `logger.warn` naming the missing file + package id (see each
`app/build.gradle`), so watch for it.

Setup per app: Firebase console -> add an Android app with the package id above
-> download `google-services.json` -> drop it at the location in the table.

> Note: these files are Firebase *client* config (public API key + sender id, no
> server secret). They are currently NOT committed and NOT gitignored - so a
> fresh clone or CI build produces a push-less APK. Decide deliberately: commit
> all three (push works everywhere) or gitignore them and treat this as a
> documented setup step. The customer file exists only in the current working
> tree today.

## Asset links (App Links) - IMPORTANT

`assetlinks.<app>.json` here contains the **debug** signing SHA-256
(`BE:B8:...:C6`). For a **release** build you MUST add the release keystore's
SHA-256 to the `sha256_cert_fingerprints` array (get it with
`keytool -list -v -keystore <release.keystore> -alias <alias>`), or App Links
won't verify for the store build.
