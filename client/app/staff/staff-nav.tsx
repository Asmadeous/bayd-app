"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Briefcase, CalendarDays, MessageCircle, User, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { hapticTap } from "@/lib/native/haptics"

type Tab = { label: string; href: string; icon: LucideIcon; also?: string[] }

// Staff app tabs. Schedule is home; Manage holds shifts, earnings, fuel and
// reviews and past jobs; Messages is live chat with clients; Profile rounds it
// out. New booking is reachable from Schedule.
const tabs: Tab[] = [
  { label: "Schedule", href: "/staff/schedule", icon: CalendarDays, also: ["/staff/notifications"] },
  { label: "Manage", href: "/staff/manage", icon: Briefcase, also: ["/staff/past", "/staff/shifts", "/staff/earnings", "/staff/fuel", "/staff/reviews"] },
  { label: "Messages", href: "/staff/messages", icon: MessageCircle },
  // Screens opened from Profile keep its tab lit so you always know where you are.
  { label: "Profile", href: "/staff/profile", icon: User },
]

export function StaffNav() {
  const pathname = usePathname()
  return (
    <nav
      aria-label="Primary"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
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
                  active ? "text-[#9E4A60]" : "text-[#14100F]/50",
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
