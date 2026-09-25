"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { CalendarDays, Clock3, MessageCircle, User, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { hapticTap } from "@/lib/native/haptics"

type Tab = { label: string; href: string; icon: LucideIcon; also?: string[] }

// Staff app tabs. Schedule is home; Shifts is the clock/history; Messages is
// live chat with clients; Profile rounds it out. Reviews, Gift cards and New
// booking are reachable from Profile / Schedule (every dashboard surface stays
// present, just not all as tabs).
const tabs: Tab[] = [
  { label: "Schedule", href: "/staff/schedule", icon: CalendarDays },
  { label: "Shifts", href: "/staff/shifts", icon: Clock3 },
  { label: "Messages", href: "/staff/messages", icon: MessageCircle },
  // Screens opened from Profile keep its tab lit so you always know where you are.
  { label: "Profile", href: "/staff/profile", icon: User, also: ["/staff/earnings", "/staff/reviews", "/staff/gift-cards"] },
]

export function StaffNav() {
  const pathname = usePathname()
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-black/10 bg-[#F4F2EF]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around px-2">
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
                  "flex h-[4.25rem] flex-col items-center justify-center gap-1 text-[0.6rem] font-semibold uppercase tracking-[0.08em] transition-colors",
                  active ? "text-[#C96C83]" : "text-[#14100F]/45",
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
