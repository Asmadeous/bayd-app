"use client"

import Link from "next/link"
import { CalendarDays, Gift, MessageCircle, User, type LucideIcon } from "lucide-react"

import { openLegal } from "@/components/legal/legal-links"
import { AppHeader } from "./app-header"
import { appScreenClass, cardClass, mutedClass } from "./app-theme"

type Section = { title: string; icon: LucideIcon; heading: string; body: string; legal?: boolean }

// What a signed-out customer sees on an account screen (iOS keeps the app open
// without a login; see guest-browse). Matched by path prefix, first match wins.
const SECTIONS: [string[], Section][] = [
  [
    ["/app/account", "/app/addresses"],
    { title: "Profile", icon: User, heading: "Sign in to your account", body: "Manage your details, addresses and app settings.", legal: true },
  ],
  [
    ["/app/chat", "/app/messages", "/app/support"],
    { title: "Chat", icon: MessageCircle, heading: "Sign in to chat", body: "Message your technician and the B.A.Y.D team about your visits." },
  ],
  [
    ["/app/manage", "/app/past", "/app/orders", "/app/transactions", "/app/gift-cards", "/app/loyalty", "/app/subscriptions"],
    { title: "Management", icon: Gift, heading: "Sign in to manage your visits", body: "See past visits, orders, payments, gift cards, rewards and repeat bookings." },
  ],
]
const FALLBACK: Section = { title: "Bookings", icon: CalendarDays, heading: "Sign in to see your bookings", body: "Your upcoming visits and updates appear here once you sign in." }

export function SignInPrompt({ pathname }: { pathname: string }) {
  const section = SECTIONS.find(([prefixes]) => prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`)))?.[1] ?? FALLBACK
  const Icon = section.icon

  return (
    <div className={appScreenClass}>
      <AppHeader title={section.title} />
      <div className="space-y-4 px-5">
        <section className={`${cardClass} flex flex-col items-center gap-2 p-7 text-center`}>
          <Icon className="size-8 text-[#C96C83]" aria-hidden />
          <p className="text-lg font-bold">{section.heading}</p>
          <p className={`text-sm ${mutedClass}`}>{section.body}</p>
          <Link href="/app/signin" className="mt-3 flex h-12 w-full items-center justify-center rounded-2xl bg-[#C96C83] text-base font-bold text-white">
            Sign in
          </Link>
          <Link href="/app/signup" className="flex h-12 w-full items-center justify-center rounded-2xl border border-black/10 bg-white text-base font-bold">
            Create an account
          </Link>
        </section>
        {section.legal ? (
          <div className={`flex justify-center gap-5 text-sm font-semibold ${mutedClass}`}>
            <button type="button" onClick={() => void openLegal("/privacy")}>
              Privacy policy
            </button>
            <button type="button" onClick={() => void openLegal("/terms")}>
              Terms of service
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
