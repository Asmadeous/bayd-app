"use client"

import { useEffect } from "react"
import { Capacitor } from "@capacitor/core"

import api from "@/lib/api"
import { useAuthStore } from "@/lib/stores/auth-store"

// Registers this device for push once the user is authenticated (native only).
// Flow: ask permission -> register with FCM/APNs -> receive the token -> send it
// to POST /device_tokens (the 2d backend). On sign-out we DELETE the last token.
// No-ops on the web. The FCM token arrives via a listener, so we register the
// listener first, then call register().
export function usePushRegistration() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !isAuthenticated) return

    let lastToken: string | null = null
    let removeListeners: (() => void) | undefined

    ;(async () => {
      const { PushNotifications } = await import("@capacitor/push-notifications")

      const platform = Capacitor.getPlatform() // "ios" | "android"

      const registration = await PushNotifications.addListener("registration", async (token) => {
        lastToken = token.value
        try {
          await api.post("/device_tokens", { token: token.value, platform })
        } catch {
          // best-effort — a failed registration must never break the app
        }
      })

      const errorListener = await PushNotifications.addListener("registrationError", () => {
        // swallow — push is optional; the app works without it
      })

      removeListeners = () => {
        registration.remove()
        errorListener.remove()
      }

      const perm = await PushNotifications.requestPermissions()
      if (perm.receive === "granted") {
        await PushNotifications.register()
      }
    })()

    return () => {
      removeListeners?.()
      // Unregister this device on sign-out so we stop pushing to it.
      if (lastToken) {
        api.delete("/device_tokens", { data: { token: lastToken } }).catch(() => {})
      }
    }
  }, [isAuthenticated])
}
