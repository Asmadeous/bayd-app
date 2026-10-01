"use client"

import { useState, useSyncExternalStore } from "react"
import { Capacitor } from "@capacitor/core"
import { Smartphone, X } from "lucide-react"

import { APP_STORE, GOOGLE_PLAY, anyAppLive } from "@/lib/app-links"
import { cn } from "@/lib/utils"

// The stores' official badges (public/images/stores, from Apple's and Google's
// badge pages). Google's PNG carries its own padding, hence the taller size and
// negative margin to line it up with Apple's.
export function AppStoreButtons({ className }: { className?: string }) {
  if (!anyAppLive) return null

  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      {APP_STORE.live ? (
        <a href={APP_STORE.url} rel="noreferrer" target="_blank" aria-label="Download on the App Store">
          {/* eslint-disable-next-line @next/next/no-img-element -- static SVG badge */}
          <img src="/images/stores/app-store-badge.svg" alt="Download on the App Store" className="h-10 w-auto" />
        </a>
      ) : null}
      {GOOGLE_PLAY.live ? (
        <a href={GOOGLE_PLAY.url} rel="noreferrer" target="_blank" aria-label="Get it on Google Play" className="-my-[9px]">
          {/* eslint-disable-next-line @next/next/no-img-element -- static PNG badge */}
          <img src="/images/stores/google-play-badge.png" alt="Get it on Google Play" className="h-[58px] w-auto" />
        </a>
      ) : null}
    </div>
  )
}

// On a computer, scan with your phone's camera to open the store listing.
function StoreQrCodes() {
  const codes = [
    APP_STORE.live && { src: "/images/stores/app-store-qr.svg", label: "iPhone" },
    GOOGLE_PLAY.live && { src: "/images/stores/google-play-qr.svg", label: "Android" },
  ].filter(Boolean) as { src: string; label: string }[]
  if (codes.length === 0) return null

  return (
    <div className="mt-6 hidden gap-4 lg:flex">
      {codes.map((code) => (
        <figure key={code.label} className="border border-black/10 bg-white p-2 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- static QR code */}
          <img src={code.src} alt={`QR code for the ${code.label} app`} className="size-28" />
          <figcaption className="mt-1 text-xs font-semibold text-[#5f6268]">Scan for {code.label}</figcaption>
        </figure>
      ))}
    </div>
  )
}

// Homepage section: what the app adds over booking on the website.
export function GetTheAppSection() {
  if (!anyAppLive) return null

  return (
    <section className="bg-[#f4f1eb] py-16 text-[#101217]">
      <div className="mx-auto grid w-full max-w-[1760px] gap-8 px-4 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:px-8 2xl:px-10">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#a36f4d]">The BAYD app</p>
          <h2 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">Your beauty appointments, in your pocket.</h2>
          <p className="mt-4 max-w-xl text-base leading-7 text-[#4f535a]">
            Book in a few taps, see when your technician is on the way, message them before your visit, and keep every
            receipt in one place.
          </p>
          <AppStoreButtons className="mt-6" />
          <StoreQrCodes />
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {[
            ["Live arrival", "Follow your technician on the map on the day."],
            ["Chat", "Message your technician and our team."],
            ["Reminders", "Notifications before every appointment."],
            ["Rebook fast", "Your address and favourite services, saved."],
          ].map(([title, text]) => (
            <li key={title} className="border border-black/10 bg-white/70 p-5">
              <p className="font-extrabold">{title}</p>
              <p className="mt-1 text-sm text-[#5f6268]">{text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

// After booking on the website: nudge towards the app for the day-of tracking.
// Renders nothing inside the apps themselves, which share the booking screen.
export function BookedAppPrompt() {
  // Only reached after a booking is made in the browser, never server-rendered.
  if (!anyAppLive || Capacitor.isNativePlatform()) return null

  return (
    <div className="mx-auto mt-5 max-w-md border-t border-black/10 pt-4">
      <p className="text-sm font-semibold text-[#101217]">Track your technician on the day with the BAYD app.</p>
      <AppStoreButtons className="mt-3 justify-center" />
    </div>
  )
}

const DISMISS_KEY = "bayd-app-banner-dismissed"

function wasDismissed() {
  try {
    return !!localStorage.getItem(DISMISS_KEY)
  } catch {
    return false // Storage blocked: still show it; dismissing just won't be remembered.
  }
}

function androidBrowserNotDismissed() {
  return GOOGLE_PLAY.live && !Capacitor.isNativePlatform() && /Android/i.test(navigator.userAgent) && !wasDismissed()
}

const noSubscribe = () => () => {}

// Android browsers have no built-in "open in app" banner like iPhone Safari,
// so show a small dismissible one at the top of the site header (the bottom
// corner is taken by the chat bubble). Hidden inside the app itself, and never
// server-rendered (the server can't know the device).
export function AndroidAppBanner() {
  const eligible = useSyncExternalStore(noSubscribe, androidBrowserNotDismissed, () => false)
  const [dismissed, setDismissed] = useState(false)

  if (!eligible || dismissed) return null

  function dismiss() {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISS_KEY, "1")
    } catch {
      // Ignore: see wasDismissed.
    }
  }

  return (
    <div className="flex items-center gap-3 border-b border-black/10 bg-white px-4 py-2">
      <Smartphone aria-hidden className="size-5 shrink-0 text-[#c96c83]" />
      <p className="min-w-0 flex-1 text-sm font-semibold text-[#101217]">Book faster in the BAYD app</p>
      <a href={GOOGLE_PLAY.url} className="rounded-lg bg-[#101217] px-3 py-1.5 text-sm font-bold text-white">
        Get
      </a>
      <button type="button" aria-label="Dismiss" onClick={dismiss} className="p-1 text-[#5f6268]">
        <X className="size-4" />
      </button>
    </div>
  )
}
