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

      // Android 8+ requires a notification channel; without one, FCM messages land
      // on a silent default channel (no sound, no heads-up banner). Create a
      // high-importance channel so notifications actually make a sound and pop.
      // The backend sends android.notification.channel_id = "bayd_default".
      if (platform === "android") {
        try {
          await PushNotifications.createChannel({
            id: "bayd_default",
            name: "Bookings & updates",
            description: "Appointment updates, messages, and reminders",
            importance: 5, // IMPORTANCE_HIGH: sound + heads-up banner
            visibility: 1, // VISIBILITY_PUBLIC
            sound: "default",
            vibration: true,
            lights: true,
          })
        } catch {
          // channel creation is best-effort; push still works, just quieter
        }
      }

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

      // Foreground gap: when a push arrives while the app is OPEN, Android hands
      // it to the app instead of showing a banner - so without this it's silently
      // dropped and the user never sees it. Re-display it as a local notification
      // (same high-importance channel) so it shows + makes a sound regardless of
      // whether the app is foreground, backgrounded, or closed.
      const foregroundListener = await PushNotifications.addListener(
        "pushNotificationReceived",
        async (notification) => {
          try {
            const { LocalNotifications } = await import("@capacitor/local-notifications")
            await LocalNotifications.schedule({
              notifications: [
                {
                  id: Date.now() % 2147483647,
                  title: notification.title ?? "BAYD",
                  body: notification.body ?? "",
                  channelId: platform === "android" ? "bayd_default" : undefined,
                  extra: notification.data,
                },
              ],
            })
          } catch {
            // best-effort — never break the app over a foreground display
          }
        },
      )

      removeListeners = () => {
        registration.remove()
        errorListener.remove()
        foregroundListener.remove()
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
