"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"

export function UnsubscribedMessage() {
  const invalid = useSearchParams().has("invalid")

  return invalid ? (
    <>
      <h1 className="text-3xl font-black tracking-tight md:text-4xl">That link didn&apos;t work</h1>
      <p className="mt-4 leading-relaxed text-[#14100F]/80">
        This unsubscribe link is invalid or was already used. To stop our emails, reply to any newsletter or write to{" "}
        <a className="font-semibold text-[#9E4A60] underline" href="mailto:Bookings@baydspa.ca">
          Bookings@baydspa.ca
        </a>{" "}
        and we&apos;ll remove you.
      </p>
    </>
  ) : (
    <>
      <h1 className="text-3xl font-black tracking-tight md:text-4xl">You&apos;re unsubscribed</h1>
      <p className="mt-4 leading-relaxed text-[#14100F]/80">
        You won&apos;t get the Beauty @ Your Door newsletter anymore. Booking confirmations and receipts still come by
        email and text, since they&apos;re about your appointments.
      </p>
      <p className="mt-6">
        <Link className="font-semibold text-[#9E4A60] underline" href="/">
          Back to baydspa.ca
        </Link>
      </p>
    </>
  )
}
