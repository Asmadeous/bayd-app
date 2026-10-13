"use client"

import { useState } from "react"

import { useBranchAnalytics } from "@/lib/hooks/use-super"
import { AdminHeader } from "../admin-header"
import { adminScreenClass, cardClass, mutedClass } from "../admin-theme"
import { SuperGate } from "../super-gate"
import { fieldClass } from "../ui"

const thisMonth = () => new Date().toISOString().slice(0, 7)

// Each franchise's figures in its own currency (no conversion).
const money = (value: string | number, currency: string) => new Intl.NumberFormat(undefined, { style: "currency", currency }).format(Number(value) || 0)

export default function AdminBranchesScreen() {
  return (
    <SuperGate title="All branches">
      <Branches />
    </SuperGate>
  )
}

// The web All branches page: every franchise side by side for a month.
function Branches() {
  const [month, setMonth] = useState(thisMonth)
  const { data, isLoading } = useBranchAnalytics(month)

  return (
    <div className={adminScreenClass}>
      <AdminHeader title="All branches" />
      <p className={`px-5 pb-3 text-sm ${mutedClass}`}>Each franchise side by side for a month, in its own currency.</p>
      <div className="space-y-3 px-5">
        <input type="month" aria-label="Month" className={fieldClass} value={month} onChange={(e) => setMonth(e.target.value || thisMonth())} />
        {isLoading ? (
          <p className={`text-sm ${mutedClass}`}>Loading…</p>
        ) : (
          data?.franchises.map((f) => (
            <section key={f.id} className={`${cardClass} p-4`}>
              <p className="text-base font-bold">
                {f.name} <span className={`text-xs font-normal ${mutedClass}`}>({f.status})</span>
              </p>
              <dl className="mt-3 grid grid-cols-3 gap-x-3 gap-y-3 text-sm">
                <Stat label="Bookings" value={f.bookings} />
                <Stat label="Completed" value={f.completed} />
                <Stat label="Cancelled" value={f.cancelled} />
                <Stat label="Booked value" value={money(f.booked_value, f.currency)} />
                <Stat label="Received" value={money(f.received, f.currency)} />
                <Stat label="Royalty" value={`${money(f.royalty_estimate, f.currency)} (${Number(f.royalty_pct)}%)`} />
                <Stat label="Customers" value={f.customers} />
                <Stat label="Technicians" value={f.technicians} />
              </dl>
            </section>
          ))
        )}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-0">
      <dt className={`text-[0.7rem] font-bold uppercase tracking-wide ${mutedClass}`}>{label}</dt>
      <dd className="break-words font-bold">{value}</dd>
    </div>
  )
}
