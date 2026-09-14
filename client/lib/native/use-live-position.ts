"use client"

import { useEffect, useState } from "react"
import { Capacitor } from "@capacitor/core"

export interface LivePosition {
  latitude: number
  longitude: number
  accuracy_meters?: number
  heading?: number | null
}

// Watch THIS device's GPS live (the tech navigating to a job). Native uses
// @capacitor/geolocation, the web falls back to navigator.geolocation. Returns
// the latest fix (null until the first one) plus any permission/hardware error.
// Cleans up its watch on unmount. Unlike use-location-sharing (which POSTs the
// tech's position for customers to see), this is purely local - it drives the
// in-app navigation map's "you are here" pin.
export function useLivePosition(active: boolean) {
  const [position, setPosition] = useState<LivePosition | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!active) return
    let cancelled = false
    let clear: (() => void) | undefined

    ;(async () => {
      if (Capacitor.isNativePlatform()) {
        const { Geolocation } = await import("@capacitor/geolocation")
        const perm = await Geolocation.requestPermissions().catch(() => null)
        if (cancelled) return
        if (perm?.location === "denied") {
          setError("Location access is off. Enable it to navigate.")
          return
        }
        const id = await Geolocation.watchPosition(
          { enableHighAccuracy: true, timeout: 20000 },
          (pos, err) => {
            if (cancelled) return
            if (err || !pos) {
              setError("Couldn't read your location.")
              return
            }
            setError(null)
            setPosition({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy_meters: Math.round(pos.coords.accuracy ?? 0),
              heading: pos.coords.heading ?? null,
            })
          },
        )
        clear = () => {
          import("@capacitor/geolocation").then(({ Geolocation }) =>
            Geolocation.clearWatch({ id }).catch(() => {}),
          )
        }
        return
      }

      if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
        setError("Location isn't available on this device.")
        return
      }
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          if (cancelled) return
          setError(null)
          setPosition({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy_meters: Math.round(pos.coords.accuracy),
            heading: pos.coords.heading,
          })
        },
        (err) => {
          if (cancelled) return
          setError(err.message || "Couldn't read your location. Allow location access.")
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
      )
      clear = () => navigator.geolocation.clearWatch(watchId)
    })()

    return () => {
      cancelled = true
      clear?.()
    }
  }, [active])

  return { position, error }
}
