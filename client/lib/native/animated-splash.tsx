"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { AnimatePresence, motion } from "motion/react"
import { Capacitor } from "@capacitor/core"

// The animated splash that plays on native app launch (iOS + Android, all apps).
// The NATIVE splash is a static brand image (launchAutoHide: false in
// capacitor.config); this web overlay renders on top of it, then we hide the
// native one so there's no seam, play the brand reveal, and fade out. No-ops on
// the web - the marketing site keeps its own loading behaviour.
//
// Sequence: overlay mounts over the still-visible native splash -> next frame we
// hide the native splash (the web overlay now covers the screen with the same
// ink) -> the logo scales + fades in over a blush glow -> after HOLD_MS the whole
// overlay fades out, revealing the app underneath.
const HOLD_MS = 1500

export function AnimatedSplash() {
  const [native] = useState(() => Capacitor.isNativePlatform())
  const [visible, setVisible] = useState(native)

  useEffect(() => {
    if (!native) return

    // Hand off from the native splash to this web overlay on the next frame, once
    // this component has painted, so the screen never flashes to white between them.
    const raf = requestAnimationFrame(async () => {
      const mod = await import("@capacitor/splash-screen").catch(() => null)
      await mod?.SplashScreen.hide().catch(() => {})
    })

    const timer = setTimeout(() => setVisible(false), HOLD_MS)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(timer)
    }
  }, [native])

  if (!native) return null

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="animated-splash"
          className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-[#F6F1EC]"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          {/* Blush glow, breathing in behind the mark. */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute size-80 rounded-full bg-[#C96C83]/15 blur-3xl"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          />
          <motion.div
            className="relative h-40 w-72"
            initial={{ scale: 0.86, opacity: 0, y: 6 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.08 }}
          >
            <Image
              alt="Beauty @ Your Door"
              className="object-contain"
              fill
              priority
              src="/images/brand/bayd-logo-black.png"
              unoptimized
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
