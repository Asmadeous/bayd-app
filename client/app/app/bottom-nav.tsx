"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { Briefcase, CalendarDays, MessageCircle, ShoppingBag, User, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { hapticTap } from "@/lib/native/haptics"

type Tab = { label: string; href: string; icon: LucideIcon; also?: string[] }

// The app tabs - a floating rounded bar above the screen edge; every tab keeps
// its label and the active one sits in a pink pill. Booking starts from Book now on
// the Bookings tab. Screens opened from a tab keep that tab lit, so you always
// know where you are.
const tabs: Tab[] = [
  { label: "Bookings", href: "/app/home", icon: CalendarDays, also: ["/app/notifications", "/app/bookings", "/app/book"] },
  {
    label: "Management",
    href: "/app/manage",
    icon: Briefcase,
    also: ["/app/past", "/app/orders", "/app/transactions", "/app/gift-cards", "/app/loyalty"],
  },
  { label: "Shop", href: "/app/shop", icon: ShoppingBag },
  { label: "Chat", href: "/app/chat", icon: MessageCircle, also: ["/app/messages", "/app/support"] },
  { label: "Profile", href: "/app/account", icon: User, also: ["/app/subscriptions", "/app/addresses"] },
]

export function BottomNav() {
  const pathname = usePathname()
  // Auto-hide on scroll down, reveal on scroll up (native app pattern).
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    let lastY = window.scrollY
    function onScroll() {
      // Book pins its Continue bar right above the tabs, so the tabs stay put there.
      if (window.location.pathname.startsWith("/app/book")) return setHidden(false)
      const y = window.scrollY
      // Ignore tiny jitters; require a small delta to toggle.
      if (Math.abs(y - lastY) < 8) return
      // Hide when scrolling down past a small threshold; show when scrolling up.
      setHidden(y > lastY && y > 48)
      lastY = y
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <nav
      aria-label="Primary"
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-0 z-50 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] transition-transform duration-300",
        hidden && "translate-y-[150%]",
      )}
    >
      <ul className="pointer-events-auto mx-auto flex max-w-md items-stretch rounded-[1.75rem] border border-black/10 bg-white/95 px-1 py-1.5 shadow-[0_8px_24px_rgba(20,16,15,0.12)] backdrop-blur-xl">
        {tabs.map((tab) => {
          const active = [tab.href, ...(tab.also ?? [])].some((r) => pathname === r || pathname.startsWith(`${r}/`))
          const Icon = tab.icon
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                onClick={() => hapticTap()}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-14 flex-col items-center justify-center gap-0.5 text-[0.75rem] font-semibold transition-colors",
                  active ? "text-[#9E4A60]" : "text-[#101217]/50",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                    active && "bg-[#C96C83]/15",
                  )}
                >
                  <Icon aria-hidden="true" className={cn("size-[1.3rem]", active && "stroke-[2.4]")} />
                </span>
                <span className="max-w-full truncate px-0.5">{tab.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
