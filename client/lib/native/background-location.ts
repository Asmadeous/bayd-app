import { Capacitor, registerPlugin } from "@capacitor/core"

import type { PluginListenerHandle } from "@capacitor/core"

export interface BackgroundLocationFix {
  latitude: number
  longitude: number
  accuracy_meters: number
}

interface BackgroundLocationPlugin {
  start(): Promise<{ started: boolean }>
  stop(): Promise<void>
  addListener(
    event: "location",
    handler: (fix: BackgroundLocationFix) => void
  ): Promise<PluginListenerHandle>
}

// Native background location, registered only by the staff app (see
// ios-employee/App/App/BackgroundLocationPlugin.swift). @capacitor/geolocation
// never sets allowsBackgroundLocationUpdates, so its watch dies when iOS
// suspends the app; this keeps a tech's shift tracking alive.
const BackgroundLocation = registerPlugin<BackgroundLocationPlugin>("BackgroundLocation")

// False in the customer app and on the web, where the plugin isn't registered,
// so callers fall back to @capacitor/geolocation.
export function backgroundLocationAvailable(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("BackgroundLocation")
}

export default BackgroundLocation
