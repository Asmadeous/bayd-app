"use client"

import { useState } from "react"
import { Capacitor } from "@capacitor/core"
import { MapPin } from "lucide-react"

const SEEN_KEY = "bayd.staff.locationDisclosureSeen"

function seen() {
  try {
    return window.localStorage.getItem(SEEN_KEY) === "1"
  } catch {
    return false
  }
}

// Prominent disclosure the stores require before the staff app first asks for
// location (clock-in, navigation, on-shift sharing). Native only, shown until the
// tech taps Continue once on this device; "Not now" hides it for this launch.
// The copy must match what the app really does: shared only while on shift, and
// on iOS that continues with the app in the background (Android: while open).
export function LocationDisclosure() {
  const [open, setOpen] = useState(() => Capacitor.isNativePlatform() && !seen())
  if (!open) return null

  const ios = Capacitor.getPlatform() === "ios"

  function accept() {
    try {
      window.localStorage.setItem(SEEN_KEY, "1")
    } catch {
      // Not remembered; it shows again next launch.
    }
    setOpen(false)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="location-disclosure-title"
      className="fixed inset-0 z-[80] flex flex-col bg-[#F4F2EF] px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[calc(2.5rem+var(--top-inset,0px))] text-[#14100F]"
    >
      <div className="flex-1 overflow-y-auto">
        <span className="grid size-14 place-items-center rounded-2xl bg-[#C96C83]/15">
          <MapPin className="size-7 text-[#C96C83]" aria-hidden />
        </span>
        <h1 id="location-disclosure-title" className="mt-5 text-2xl font-black tracking-tight">
          BAYD Staff uses your location while you&apos;re on shift
        </h1>
        <ul className="mt-5 space-y-3 text-[0.95rem] leading-relaxed text-[#14100F]/80">
          <li>
            <strong>When:</strong> only while you&apos;re on shift.
            {ios
              ? " Sharing keeps going when the app is in the background or the screen is locked, until your shift ends."
              : " Sharing happens while the app is open."}
          </li>
          <li>
            <strong>Why:</strong> your client sees you approaching on the day of their appointment, clock-in checks that
            you&apos;ve arrived, and your shift mileage is recorded for fuel reimbursement.
          </li>
          <li>
            <strong>Who sees it:</strong> the client you&apos;re heading to and the BAYD office. It&apos;s never
            shared when you&apos;re off shift.
          </li>
        </ul>
        <p className="mt-5 text-sm text-[#14100F]/60">
          Your phone will ask for location permission when you first clock in. You can change it any time in your
          phone&apos;s settings, but clock-in needs it.
        </p>
      </div>
      <button type="button" onClick={accept} className="mt-6 w-full rounded-2xl bg-[#14100F] py-3.5 text-base font-bold text-white">
        Continue
      </button>
      <button type="button" onClick={() => setOpen(false)} className="mt-2 w-full rounded-2xl py-3 text-base font-bold text-[#14100F]/70">
        Not now
      </button>
    </div>
  )
}
