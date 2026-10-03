"use client"

import { Fuel, Route } from "lucide-react"

import { LoadMore } from "@/components/load-more"
import { useShiftsList, type Shift } from "@/lib/hooks/use-time-clock"
import { StaffHeader } from "../staff-header"
import { cardClass, eyebrowClass, mutedClass, staffScreenClass } from "../staff-theme"
import { formatMoney } from "@/lib/stores/franchise-store"

const money = (v: string | number | null | undefined) => `${formatMoney(Number(v ?? 0))}`
const km = (v: string | number | null | undefined) => `${Number(v ?? 0).toFixed(1)} km`

// Fuel and mileage from the tech's shift records: the totals, then each shift's
// distance and reimbursement. Partner accounts aren't reimbursed for fuel, so
// their totals simply stay at zero.
export default function StaffFuelScreen() {
  const { items: shifts, first, isLoading, hasMore, loadingMore, loadMore } = useShiftsList()
  const totals = first?.totals
  const driven = shifts.filter((s) => s.status === "closed" && Number(s.distance_km) > 0)

  return (
    <div className={staffScreenClass}>
      <StaffHeader back title="Fuel & mileage" />
      <div className="space-y-4 px-5">
        <section className="rounded-2xl bg-[#14100F] p-5 text-white">
          <p className="text-sm font-bold text-white/60">Reimbursement to date</p>
          <p className="mt-1 text-4xl font-black tracking-tight">{money(totals?.fuel_reimbursement)}</p>
          <p className="mt-1 text-base text-white/70">{km(totals?.distance_km)} driven</p>
        </section>

        {isLoading ? (
          <div className="h-24 animate-pulse rounded-2xl bg-black/5" />
        ) : driven.length === 0 ? (
          <div className={`${cardClass} flex flex-col items-center gap-2 p-8 text-center`}>
            <Route className="size-7 text-[#C96C83]" aria-hidden />
            <p className="font-bold">No mileage yet</p>
            <p className={`text-sm ${mutedClass}`}>Distance is recorded when you clock in and out of jobs.</p>
          </div>
        ) : (
          <section className={`${cardClass} p-4`}>
            <p className={eyebrowClass}>By shift</p>
            <ul className="mt-2 divide-y divide-black/[0.06]">
              {driven.map((s) => (
                <FuelRow key={s.id} shift={s} />
              ))}
            </ul>
            <LoadMore hasMore={hasMore} loading={loadingMore} onLoad={loadMore} />
          </section>
        )}
      </div>
    </div>
  )
}

function FuelRow({ shift }: { shift: Shift }) {
  const day = new Date(shift.clock_in_at).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
  return (
    <li className="flex items-center gap-3 py-3">
      <Fuel className="size-5 shrink-0 text-[#C96C83]" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold">{day}</span>
        <span className={`block text-sm ${mutedClass}`}>{km(shift.distance_km)}</span>
      </span>
      <span className="text-base font-bold">{money(shift.fuel_reimbursement)}</span>
    </li>
  )
}
