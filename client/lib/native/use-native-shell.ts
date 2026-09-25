"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { Capacitor } from "@capacitor/core"

// The crossover luminance where black text stops out-contrasting white text
// (WCAG: sqrt(1.05 * 0.05) - 0.05). Above it a screen wants dark status bar
// icons, below it light ones. A plain 0.5 midpoint gets mid-tones like the
// brand pink (#C96C83, L≈0.25) wrong.
const DARK_ICON_THRESHOLD = 0.179

// Fired by AnimatedSplash once it has faded out.
export const SPLASH_DONE_EVENT = "bayd:splash-done"

function relativeLuminance(r: number, g: number, b: number) {
  const lin = (c: number) => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

const hex = (n: number) => n.toString(16).padStart(2, "0")

// What is actually painted behind the status bar right now? Screens set their
// own background (dark #14100F, pink #C96C83, paper #F6F1EC, ...), so the bar
// has to follow the screen rather than a single hard-coded colour. Walk up from
// the topmost element at the top edge until something has a non-transparent
// background.
function topBackground(): { color: string; luminance: number } | null {
  if (typeof document === "undefined") return null
  let node = document.elementFromPoint(Math.round(window.innerWidth / 2), 1)
  for (; node; node = node.parentElement) {
    const match = /^rgba?\(([^)]+)\)/.exec(getComputedStyle(node).backgroundColor)
    if (!match) continue
    const parts = match[1].split(",").map((p) => Number(p.trim()))
    const [r, g, b] = parts
    const alpha = parts.length > 3 ? parts[3] : 1
    if (!alpha) continue // fully transparent - keep looking up the tree
    return { color: `#${hex(r)}${hex(g)}${hex(b)}`, luminance: relativeLuminance(r, g, b) }
  }
  return null
}

// Native app shell setup: status bar, splash screen, and the Android hardware
// back button. This module ships in BOTH the website and the Capacitor app (one
// codebase), so every native call is guarded by Capacitor.isNativePlatform() and
// no-ops on the web. Plugins are imported dynamically so the web bundle never
// pulls native code.
export function useNativeShell() {
  const pathname = usePathname()

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    let cleanup: (() => void) | undefined

    ;(async () => {
      const [{ StatusBar }, { App }] = await Promise.all([
        import("@capacitor/status-bar"),
        import("@capacitor/app"),
      ])

      // The status bar sits ABOVE the WebView rather than overlaying it, so
      // scrolled content can never pass under the notch (an overlaying bar has
      // no backdrop, and these screens scroll dark cards straight under the
      // clock). The bar is a real bar - what it needed was not transparency but
      // the right COLOUR, which the per-route effect below keeps in step with
      // whatever screen is showing.
      await StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {})
      // The native splash is hidden by AnimatedSplash (it hands off to the web
      // splash animation), not here - hiding it here would flash before the overlay.

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

  // Re-match the bar to the screen on every navigation, and again when the launch
  // splash leaves: while it is up it is what sits under the bar, so the first
  // sample would otherwise pin the bar to splash pink. Runs after paint so the
  // new screen's background is the one being sampled.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    let cancelled = false
    let frame = 0
    const sync = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const sampled = topBackground()
        if (!sampled) return
        ;(async () => {
          const { StatusBar, Style } = await import("@capacitor/status-bar")
          if (cancelled) return
          // Style.Dark = light text (for dark backgrounds); Style.Light = dark text.
          const style = sampled.luminance > DARK_ICON_THRESHOLD ? Style.Light : Style.Dark
          await StatusBar.setStyle({ style }).catch(() => {})
          await StatusBar.setBackgroundColor({ color: sampled.color }).catch(() => {})
        })()
      })
    }

    sync()
    window.addEventListener(SPLASH_DONE_EVENT, sync)
    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
      window.removeEventListener(SPLASH_DONE_EVENT, sync)
    }
  }, [pathname])
}
