"use client"

import Link from "next/link"
import { BarChart3, CalendarDays, CheckCircle2, Clock3, Inbox, Users, type LucideIcon } from "lucide-react"

import { useAdminBookings } from "@/lib/hooks/use-admin"
import { useAuthStore } from "@/lib/stores/auth-store"
import { DEFAULT_FRANCHISE, useFranchiseStore } from "@/lib/stores/franchise-store"
import { AdminHeader } from "../admin-header"
import { adminScreenClass, cardClass, displayClass, eyebrowClass, mutedClass } from "../admin-theme"
import { BookingRow } from "../booking-row"
import { BUILT } from "../built"

// The web Overview's shortcuts, in the same order.
const SHORTCUTS: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "Calendar", href: "/admin/calendar", icon: CalendarDays },
  { label: "Bookings", href: "/admin/bookings", icon: Clock3 },
  { label: "Employees", href: "/admin/employees", icon: Users },
  { label: "Inquiries", href: "/admin/inquiries", icon: Inbox },
]

// Home is the web dashboard's Overview: active work, the four booking metrics,
// shortcuts and the latest bookings.
export default function AdminHomeScreen() {
  const user = useAuthStore((s) => s.user)
  const slug = useFranchiseStore((s) => s.slug)
  const franchiseName = useFranchiseStore((s) => s.config?.name) ?? DEFAULT_FRANCHISE.name
  const workingIn = user?.role === "super_admin" && !slug ? "All franchises (view only)" : franchiseName

  const { data, isLoading } = useAdminBookings({ page: 1 })
  const bookings = data?.data ?? []
  const confirmed = bookings.filter((b) => b.status === "confirmed").length
  const inProgress = bookings.filter((b) => b.status === "in_progress").length
  const completed = bookings.filter((b) => b.status === "completed").length

  return (
    <div className={adminScreenClass}>
      <AdminHeader greeting={user?.first_name ?? "there"} />
      <p className={`${eyebrowClass} px-5 pb-4`}>Working in {workingIn}</p>

      <div className="space-y-5 px-5">
        <section className="rounded-2xl bg-[#14100F] p-5 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#f0c8d3]">Active work</p>
          <p className={`${displayClass} mt-2 text-5xl leading-none`}>{confirmed + inProgress}</p>
          <p className="mt-2 text-sm text-white/65">Confirmed or in-progress bookings from the current booking feed.</p>
        </section>

        <div className="grid grid-cols-2 gap-3">
          <Metric icon={CalendarDays} label="Total bookings" value={data?.pagination?.total_count ?? "-"} />
          <Metric icon={Clock3} label="Confirmed" value={confirmed} accent />
          <Metric icon={BarChart3} label="In progress" value={inProgress} />
          <Metric icon={CheckCircle2} label="Completed" value={completed} />
        </div>

        <section>
          <p className={`${eyebrowClass} mb-2`}>Operations</p>
          <div className="grid grid-cols-2 gap-3">
            {SHORTCUTS.map((s) => {
              const Icon = s.icon
              const body = (
                <>
                  <span className={`grid size-10 place-items-center rounded-xl ${BUILT.has(s.href) ? "bg-[#14100F] text-white" : "bg-black/5 text-[#14100F]/30"}`}>
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1 text-base font-bold">{s.label}</span>
                </>
              )
              return BUILT.has(s.href) ? (
                <Link key={s.href} href={s.href} className={`${cardClass} flex items-center gap-3 p-3`}>
                  {body}
                </Link>
              ) : (
                <div key={s.href} className={`${cardClass} flex items-center gap-3 p-3 text-[#14100F]/40`}>
                  {body}
                </div>
              )
            })}
          </div>
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <p className={eyebrowClass}>Recent bookings</p>
            <Link href="/admin/bookings" className="text-sm font-bold text-[#C96C83]">
              View all
            </Link>
          </div>
          {isLoading ? (
            <p className={`text-sm ${mutedClass}`}>Loading bookings…</p>
          ) : bookings.length === 0 ? (
            <div className={`${cardClass} p-5`}>
              <p className="text-base font-bold">No bookings yet</p>
              <p className={`mt-1 text-sm ${mutedClass}`}>Bookings will appear here once customers submit appointment requests.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.slice(0, 6).map((b) => (
                <BookingRow key={b.id} booking={b} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function Metric({ icon: Icon, label, value, accent = false }: { icon: LucideIcon; label: string; value: number | string; accent?: boolean }) {
  return (
    <div className={`${cardClass} p-4`}>
      <Icon className={`size-5 ${accent ? "text-[#C96C83]" : "text-[#14100F]/50"}`} aria-hidden />
      <p className={`${displayClass} mt-2 text-3xl leading-none ${accent ? "text-[#C96C83]" : ""}`}>{value}</p>
      <p className={`mt-1 text-xs font-bold uppercase tracking-[0.1em] ${mutedClass}`}>{label}</p>
    </div>
  )
}
