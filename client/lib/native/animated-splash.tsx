"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { AnimatePresence, motion } from "motion/react"
import { Capacitor } from "@capacitor/core"

import { BubbleLoader } from "@/components/bubble-loader"
import { SPLASH_DONE_EVENT } from "@/lib/native/use-native-shell"

// The loading screen that plays on native app launch (iOS + Android, both apps).
// No-ops on the web.
//
// Android's launch frame (windowSplashScreenAnimatedIcon = splash_lockup) is this
// screen's first frame: door, name and three resting bubbles, drawn in a 288dp box
// at the dead centre of the SCREEN. This overlay paints the same lockup in the
// same box, hides the native frame, and only then do the bubbles start moving, so
// launch reads as one continuous screen. The box is shifted up by half the status
// bar because this WebView starts below the bar. Keep splash-lockup.png and the
// bubble offset in step with the native drawable if either changes.
const HOLD_MS = 2200

const DRIFT = [
  "left-[12%] size-3 [--rise-duration:6.5s] [animation-delay:0.2s]",
  "left-[26%] size-5 [--rise-duration:8s] [animation-delay:0.9s]",
  "left-[44%] size-2 [--rise-duration:5.5s] [animation-delay:0.5s]",
  "left-[63%] size-4 [--rise-duration:7s] [animation-delay:0.1s]",
  "left-[78%] size-6 [--rise-duration:9s] [animation-delay:0.7s]",
  "left-[88%] size-2.5 [--rise-duration:6s] [animation-delay:1.1s]",
]

export function AnimatedSplash() {
  const [native] = useState(() => Capacitor.isNativePlatform())
  const [visible, setVisible] = useState(native)

  useEffect(() => {
    if (!native) return

    // Hand off on the next frame, once this overlay has painted, so the screen
    // never flashes between the two.
    const raf = requestAnimationFrame(async () => {
      const mod = await import("@capacitor/splash-screen").catch(() => null)
      await mod?.SplashScreen.hide({ fadeOutDuration: 0 }).catch(() => {})
    })

    const timer = setTimeout(() => setVisible(false), HOLD_MS)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(timer)
    }
  }, [native])

  if (!native) return null

  return (
    <AnimatePresence onExitComplete={() => window.dispatchEvent(new Event(SPLASH_DONE_EVENT))}>
      {visible && (
        <motion.div
          key="animated-splash"
          className="fixed inset-0 z-[9999] overflow-hidden bg-[#C96C83]"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: "easeInOut" }}
        >
          <div aria-hidden className="pointer-events-none absolute inset-0">
            {DRIFT.map((cls) => (
              <span
                key={cls}
                className={`absolute -bottom-8 rounded-full border border-white/40 bg-white/15 opacity-0 animate-bubble-rise motion-reduce:hidden ${cls}`}
              />
            ))}
          </div>

          <div className="absolute inset-0 flex -translate-y-[calc(env(safe-area-inset-top)/2)] items-center justify-center">
            <motion.div
              aria-hidden
              className="pointer-events-none absolute size-80 rounded-full bg-white/15 blur-3xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            />
            <div className="relative size-[288px]">
              <Image
                alt="Beauty @ Your Door"
                className="size-full"
                height={1152}
                priority
                src="/images/brand/splash-lockup.png"
                unoptimized
                width={1152}
              />
              {/* Dots rest centred 196dp down the box, matching the native frame. */}
              <div className="absolute inset-x-0 top-[181px] flex justify-center">
                <BubbleLoader tone="light" />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
