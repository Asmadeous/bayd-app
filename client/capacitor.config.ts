import type { CapacitorConfig } from "@capacitor/cli"

// One client/ codebase, two separate apps: customer and employee. CAP_APP selects
// which one the Capacitor CLI targets (app id, name, and native-project folder).
// Each app builds its own static bundle to out/ (see scripts/build-mobile.mjs)
// and has its own android/ios projects under android-<app>/ios-<app>.
type CapApp = "customer" | "employee" | "admin"
const app = (process.env.CAP_APP as CapApp) || "customer"

// Each app serves its WebView from a real per-app hostname (not the default
// https://localhost). This gives the embedded content a proper origin, which
// third-party payment/embeds (e.g. HelcimPay) require - localhost is refused
// (ERR_BLOCKED_BY_RESPONSE). The bundle is still local/offline; server.hostname
// only sets the origin the WebView reports, it does NOT fetch from the network.
const apps: Record<CapApp, { appId: string; appName: string; dir: string; hostname: string }> = {
  customer: { appId: "ca.baydspa.customer", appName: "BAYD", dir: "", hostname: "m-customer.baydspa.ca" },
  employee: { appId: "ca.baydspa.staff", appName: "BAYD Staff", dir: "-employee", hostname: "m-staff.baydspa.ca" },
  admin: { appId: "ca.baydspa.admin", appName: "BAYD Admin", dir: "-admin", hostname: "m-admin.baydspa.ca" },
}

const { appId, appName, dir, hostname } = apps[app]

const config: CapacitorConfig = {
  appId,
  appName,
  webDir: "out",
  // Serve the local bundle under a real https origin per app.
  server: {
    hostname,
    androidScheme: "https",
    iosScheme: "https",
  },
  // Keep each app's native projects side by side (android/ios for customer,
  // android-employee/ios-employee for staff).
  android: dir ? { path: `android${dir}` } : undefined,
  ios: dir ? { path: `ios${dir}` } : undefined,
  plugins: {
    // The NATIVE splash is the static cream brand splash shown while the WebView
    // boots. We hide it manually (launchAutoHide: false) once the web layer is
    // ready and hand off to the ANIMATED web splash (AnimatedSplash), which uses
    // the SAME cream background + brand logo so there's no colour flip or seam
    // between the two. See providers.tsx (AnimatedSplash overlay).
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: "#F6F1EC",
      showSpinner: false,
    },
  },
}

export default config
