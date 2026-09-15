"use client"

import { useEffect } from "react"
import { Capacitor } from "@capacitor/core"

import api from "@/lib/api"
import BackgroundLocation, {
  backgroundLocationAvailable,
  type BackgroundLocationFix,
} from "@/lib/native/background-location"

// While a technician is ON SHIFT, stream their GPS to POST /employee/location so
// customers can see them approach (the 3f live-tracking backend + map). Native
// only, and only when on shift — we never track a tech who's off the clock
// (privacy + battery). No-ops on the web and when off shift.
export function useLocationSharing(onShift: boolean) {
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !onShift) return

    let cancelled = false

    const post = (latitude: number, longitude: number, accuracy: number) => {
      api
        .post("/employee/location", {
          latitude,
          longitude,
          accuracy_meters: Math.round(accuracy || 0),
        })
        .catch(() => {
          // best-effort — a dropped ping must never disrupt the tech's app
        })
    }

    // The staff app registers a background-capable plugin; @capacitor/geolocation
    // stops reporting as soon as iOS suspends the app, which is most of a shift.
    if (backgroundLocationAvailable()) {
      let remove: (() => void) | undefined

      ;(async () => {
        const handle = await BackgroundLocation.addListener(
          "location",
          (fix: BackgroundLocationFix) =>
            post(fix.latitude, fix.longitude, fix.accuracy_meters)
        )
        if (cancelled) {
          await handle.remove()
          return
        }
        remove = () => {
          handle.remove().catch(() => {})
        }
        await BackgroundLocation.start().catch(() => {})
      })()

      return () => {
        cancelled = true
        remove?.()
        BackgroundLocation.stop().catch(() => {})
      }
    }

    let watchId: string | undefined

    ;(async () => {
      const { Geolocation } = await import("@capacitor/geolocation")

      const perm = await Geolocation.requestPermissions().catch(() => null)
      if (cancelled || perm?.location === "denied") return

      // watchPosition fires on movement; each fix is posted best-effort.
      watchId = await Geolocation.watchPosition(
        { enableHighAccuracy: true, timeout: 20000 },
        (position) => {
          if (!position) return
          post(
            position.coords.latitude,
            position.coords.longitude,
            position.coords.accuracy ?? 0
          )
        }
      )
    })()

    return () => {
      cancelled = true
      if (watchId) {
        import("@capacitor/geolocation").then(({ Geolocation }) =>
          Geolocation.clearWatch({ id: watchId! }).catch(() => {})
        )
      }
    }
  }, [onShift])
}
