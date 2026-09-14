"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { CalendarDays, Home, ShoppingBag, User, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { hapticTap } from "@/lib/native/haptics"

type Tab = { label: string; href: string; icon: LucideIcon }

// The app tabs - phone-native fixed bottom bar. Bookings lives in Account (not a
// tab); Book uses the calendar icon.
const tabs: Tab[] = [
  { label: "Home", href: "/app/home", icon: Home },
  { label: "Book", href: "/app/book", icon: CalendarDays },
  { label: "Shop", href: "/app/shop", icon: ShoppingBag },
  { label: "Account", href: "/app/account", icon: User },
]

export function BottomNav() {
  const pathname = usePathname()
  // Auto-hide on scroll down, reveal on scroll up (native app pattern).
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    let lastY = window.scrollY
    function onScroll() {
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
        "fixed inset-x-0 bottom-0 z-50 border-t border-black/10 bg-[#f4f1eb]/95 backdrop-blur-xl transition-transform duration-300 pb-[env(safe-area-inset-bottom)]",
        hidden && "translate-y-full",
      )}
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around px-2">
        {tabs.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`)
          const Icon = tab.icon
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                onClick={() => hapticTap()}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-[4.5rem] flex-col items-center justify-center gap-1 text-[0.62rem] font-semibold uppercase tracking-[0.08em] transition-colors",
                  active ? "text-[#c96c83]" : "text-[#101217]/45",
                )}
              >
                <Icon aria-hidden="true" className={cn("size-[1.35rem]", active && "stroke-[2.4]")} />
                {tab.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
