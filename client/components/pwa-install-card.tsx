"use client"

import { ArrowUpRight, Smartphone } from "lucide-react"

const PWA_URL = process.env.NEXT_PUBLIC_SIMPLYBOOK_PWA_URL ?? ""

/**
 * Prompts the customer to install the SimplyBook client PWA after booking so
 * they receive reminders and can manage appointments. Renders nothing until the
 * PWA URL is configured. They log in with the same email used to book, which is
 * sent to SimplyBook with the booking.
 */
export function PwaInstallCard({ className = "" }: { className?: string }) {
  if (!PWA_URL) return null

  return (
    <div
      className={`rounded-2xl border border-black/8 bg-white p-6 text-left ${className}`}
    >
      <div className="flex items-center gap-2.5">
        <Smartphone className="size-4 text-[#c96c83]" />
        <h3 className="text-sm font-semibold text-[#101217]">
          Get reminders on your phone
        </h3>
      </div>
      <p className="mt-2 text-sm text-[#5f6268]">
        Install our free mobile app to manage your appointments and receive
        booking reminders. Sign in with the same email you booked with — your
        appointment is already waiting.
      </p>

      <a
        href={PWA_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
        style={{ background: "#c96c83" }}
      >
        Install the app
        <ArrowUpRight className="size-4" aria-hidden="true" />
      </a>

      <div className="mt-4 grid gap-1.5 rounded-xl bg-[#f4f1eb] px-4 py-3 text-xs text-[#5f6268]">
        <p>
          <b>iPhone:</b> open in Safari → tap Share → <b>Add to Home Screen</b>
        </p>
        <p>
          <b>Android:</b> open in Chrome → tap <b>Install</b> / Add to Home
          Screen
        </p>
      </div>
    </div>
  )
}
