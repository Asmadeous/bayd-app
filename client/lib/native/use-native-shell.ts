"use client"

import { useEffect } from "react"
import { Capacitor } from "@capacitor/core"

// Native app shell setup: status bar, splash screen, and the Android hardware
// back button. This module ships in BOTH the website and the Capacitor app (one
// codebase), so every native call is guarded by Capacitor.isNativePlatform() and
// no-ops on the web. Plugins are imported dynamically so the web bundle never
// pulls native code.
export function useNativeShell() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    let cleanup: (() => void) | undefined

    ;(async () => {
      const [{ StatusBar, Style }, { SplashScreen }, { App }] = await Promise.all([
        import("@capacitor/status-bar"),
        import("@capacitor/splash-screen"),
        import("@capacitor/app"),
      ])

      // Brand the status bar and reveal the app once React has mounted.
      await StatusBar.setStyle({ style: Style.Dark }).catch(() => {})
      await SplashScreen.hide().catch(() => {})

      // Android hardware back: navigate back within the app, exit only at a root.
      const handle = await App.addListener("backButton", ({ canGoBack }) => {
        if (canGoBack) {
          window.history.back()
        } else {
          App.exitApp()
        }
      })
      cleanup = () => handle.remove()
    })()

    return () => cleanup?.()
  }, [])
}
