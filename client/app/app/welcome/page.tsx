"use client"

import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

// App entry: a landing screen that sends the customer to a DEDICATED sign-in or
// sign-up page (separate screens, not a toggle). Purpose-built - full-bleed,
// single column, no website chrome.
export default function WelcomeScreen() {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-[#14100F] px-6 pb-[calc(2.5rem+env(safe-area-inset-bottom))] pt-[calc(3.5rem+env(safe-area-inset-top))] text-[#F6F1EC]">
      {/* Soft blush glow anchoring the hero. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 right-[-20%] size-72 rounded-full bg-[#C96C83]/25 blur-3xl"
      />

      <div className="relative mx-auto flex w-full max-w-sm flex-1 flex-col">
        <div className="relative mx-auto h-12 w-36">
          <Image
            alt="Beauty @ Your Door"
            className="object-contain"
            fill
            priority
            src="/images/brand/bayd-logo-white.png"
            unoptimized
          />
        </div>

        <div className="mt-14">
          <h1 className="text-[2.6rem] font-black leading-[1.03] tracking-tight">
            Beauty,
            <br />
            <span className="italic text-[#C96C83]">at your door.</span>
          </h1>
          <p className="mt-3 text-[0.95rem] leading-relaxed text-white/55">
            Book at-home nails, lashes, waxing, massage, and spa - matched to a
            technician near you.
          </p>
        </div>

        <div className="mt-auto space-y-3 pt-10">
          <Link
            href="/app/signup"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#C96C83] px-4 py-4 text-base font-bold text-white"
          >
            Create an account
            <ArrowRight className="size-[1.15rem]" aria-hidden />
          </Link>
          <Link
            href="/app/signin"
            className="flex w-full items-center justify-center rounded-2xl border border-white/15 px-4 py-4 text-base font-semibold text-white"
          >
            I already have an account
          </Link>
        </div>
      </div>
    </div>
  )
}
