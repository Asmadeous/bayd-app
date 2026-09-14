"use client"

import { useEffect } from "react"
import { Capacitor } from "@capacitor/core"

import api from "@/lib/api"

// While a technician is ON SHIFT, stream their GPS to POST /employee/location so
// customers can see them approach (the 3f live-tracking backend + map). Native
// only, and only when on shift — we never track a tech who's off the clock
// (privacy + battery). No-ops on the web and when off shift.
export function useLocationSharing(onShift: boolean) {
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !onShift) return

    let watchId: string | undefined
    let cancelled = false

    ;(async () => {
      const { Geolocation } = await import("@capacitor/geolocation")

      const perm = await Geolocation.requestPermissions().catch(() => null)
      if (cancelled || perm?.location === "denied") return

      // watchPosition fires on movement; each fix is posted best-effort.
      watchId = await Geolocation.watchPosition(
        { enableHighAccuracy: true, timeout: 20000 },
        (position) => {
          if (!position) return
          api
            .post("/employee/location", {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy_meters: Math.round(position.coords.accuracy ?? 0),
            })
            .catch(() => {
              // best-effort — a dropped ping must never disrupt the tech's app
            })
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
