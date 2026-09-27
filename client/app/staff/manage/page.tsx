"use client"

import Link from "next/link"
import { ChevronRight, Clock3, Fuel, HandCoins, History, Star, type LucideIcon } from "lucide-react"

import { StaffHeader } from "../staff-header"
import { staffScreenClass } from "../staff-theme"

const ITEMS: { href: string; icon: LucideIcon; label: string }[] = [
  { href: "/staff/past", icon: History, label: "Past jobs" },
  { href: "/staff/shifts", icon: Clock3, label: "Shifts" },
  { href: "/staff/earnings", icon: HandCoins, label: "Earnings" },
  { href: "/staff/fuel", icon: Fuel, label: "Fuel & mileage" },
  { href: "/staff/reviews", icon: Star, label: "Reviews" },
]

// The Manage tab: the tech's work records in one place.
export default function StaffManageScreen() {
  return (
    <div className={staffScreenClass}>
      <StaffHeader title="Manage" />
      <div className="px-5">
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
          {ITEMS.map((item, i) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-4 ${i < ITEMS.length - 1 ? "border-b border-black/[0.06]" : ""}`}
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#C96C83]/12">
                <item.icon className="size-5 text-[#C96C83]" aria-hidden />
              </span>
              <span className="min-w-0 flex-1 text-base font-bold text-[#14100F]">{item.label}</span>
              <ChevronRight className="size-5 text-[#14100F]/30" aria-hidden />
            </Link>
          ))}
        </section>
      </div>
    </div>
  )
}
