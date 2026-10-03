"use client"

import { useState } from "react"

import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardPage } from "@/components/dashboard/dashboard-page"
import { DashboardPanel } from "@/components/dashboard/dashboard-panel"
import { SuperOnly } from "@/components/dashboard/super-only"
import { useBranchAnalytics } from "@/lib/hooks/use-super"

const thisMonth = () => new Date().toISOString().slice(0, 7)

// Each franchise's figures in its own currency (no conversion).
function money(value: string | number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(Number(value) || 0)
}

export default function BranchAnalyticsPage() {
  const [month, setMonth] = useState(thisMonth)
  const { data, isLoading } = useBranchAnalytics(month)

  return (
    <DashboardPage maxWidth="wide">
      <DashboardHeader
        title="All branches"
        subtitle="Each franchise side by side for a month, in its own currency"
        actions={
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value || thisMonth())}
            className="h-10 border border-black/15 bg-white px-3 text-sm" aria-label="Month" />
        }
      />
      <SuperOnly>
        <DashboardPanel padding="none">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-[#fbfaf7] text-left text-[11px] uppercase tracking-[0.14em] text-[#6b6f76]">
                <tr>
                  {["Franchise", "Bookings", "Completed", "Cancelled", "Booked value", "Received", "Customers", "Technicians", "Royalty"].map((h) => (
                    <th key={h} className="px-4 py-3 font-bold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-black/8">
                {isLoading ? (
                  <tr><td className="px-4 py-4 text-[#5f6268]" colSpan={9}>Loading…</td></tr>
                ) : (
                  data?.franchises.map((f) => (
                    <tr key={f.id}>
                      <td className="px-4 py-3 font-semibold text-[#101217]">{f.name}<span className="ml-1 text-xs text-[#5f6268]">({f.status})</span></td>
                      <td className="px-4 py-3">{f.bookings}</td>
                      <td className="px-4 py-3">{f.completed}</td>
                      <td className="px-4 py-3">{f.cancelled}</td>
                      <td className="px-4 py-3">{money(f.booked_value, f.currency)}</td>
                      <td className="px-4 py-3">{money(f.received, f.currency)}</td>
                      <td className="px-4 py-3">{f.customers}</td>
                      <td className="px-4 py-3">{f.technicians}</td>
                      <td className="px-4 py-3">{money(f.royalty_estimate, f.currency)} <span className="text-xs text-[#5f6268]">({Number(f.royalty_pct)}%)</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </DashboardPanel>
      </SuperOnly>
    </DashboardPage>
  )
}
