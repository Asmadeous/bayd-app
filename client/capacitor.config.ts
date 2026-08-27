import type { CapacitorConfig } from "@capacitor/cli"

// One client/ codebase, two separate apps: customer and employee. CAP_APP selects
// which one the Capacitor CLI targets (app id, name, and native-project folder).
// Each app builds its own static bundle to out/ (see scripts/build-mobile.mjs)
// and has its own android/ios projects under android-<app>/ios-<app>.
type CapApp = "customer" | "employee"
const app = (process.env.CAP_APP as CapApp) || "customer"

const apps: Record<CapApp, { appId: string; appName: string; dir: string }> = {
  customer: { appId: "ca.baydspa.customer", appName: "BAYD", dir: "" },
  employee: { appId: "ca.baydspa.staff", appName: "BAYD Staff", dir: "-employee" },
}

const { appId, appName, dir } = apps[app]

const config: CapacitorConfig = {
  appId,
  appName,
  webDir: "out",
  // Keep each app's native projects side by side (android/ios for customer,
  // android-employee/ios-employee for staff).
  android: dir ? { path: `android${dir}` } : undefined,
  ios: dir ? { path: `ios${dir}` } : undefined,
}

export default config
