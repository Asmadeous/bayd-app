"use client"

import { useState } from "react"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { StatCard } from "@/components/dashboard/stat-card"
import {
  useAdminAnalytics,
  type AnalyticsPeriod,
  type AnalyticsEmployee,
} from "@/lib/hooks/use-admin"

const PERIODS: { key: AnalyticsPeriod; label: string }[] = [
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
  { key: "ytd", label: "Year to date" },
  { key: "all", label: "All time" },
]

const cad = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 0,
})

export default function AdminAnalyticsPage() {
  const [period, setPeriod] = useState<AnalyticsPeriod>("30d")
  const { data, isLoading } = useAdminAnalytics(period)

  const s = data?.summary

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Analytics"
        subtitle="Sales performance and worker KPIs"
      />

      {/* Period filter */}
      <div className="flex gap-2 flex-wrap">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
            style={
              period === p.key
                ? { background: "#c96c83", color: "#fff" }
                : { background: "white", color: "#5f6268", border: "1px solid #e5e5e5" }
            }
          >
            {p.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-sm text-[#5f6268]">Loading analytics…</div>
      ) : !data ? (
        <div className="text-sm text-[#5f6268]">No analytics available.</div>
      ) : (
        <>
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard label="Total Revenue" value={cad.format(s!.total_revenue)} accent />
            <StatCard label="Service Revenue" value={cad.format(s!.service_revenue)} />
            <StatCard label="Product Revenue" value={cad.format(s!.product_revenue)} />
            <StatCard label="Completed Bookings" value={s!.completed_bookings} />
            <StatCard label="New Customers" value={s!.new_customers} />
            <StatCard
              label="Avg Rating"
              value={s!.average_rating != null ? s!.average_rating.toFixed(1) : "—"}
              sub={
                s!.completion_rate != null
                  ? `${Math.round(s!.completion_rate * 100)}% completion rate`
                  : undefined
              }
            />
          </div>

          {/* Revenue trend */}
          <RevenueTrend trend={data.revenue_trend} />

          {/* Invoices / transactions */}
          {data.invoices && <InvoicesPanel invoices={data.invoices} />}

          {/* Employee leaderboard */}
          <EmployeeLeaderboard employees={data.employees} />

          {/* Top services */}
          <TopServices services={data.top_services} />
        </>
      )}
    </div>
  )
}

function InvoicesPanel({ invoices }: { invoices: import("@/lib/hooks/use-admin").AnalyticsInvoices }) {
  const KIND_LABEL: Record<string, string> = { booking: "Bookings", order: "Products", gift_card: "Gift cards", manual: "Manual" }
  const kinds = Object.entries(invoices.by_kind)
  return (
    <div className="rounded-xl border border-black/8 bg-white p-5">
      <h2 className="text-sm font-semibold text-[#101217] mb-4">Transactions / Invoices</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard label="Invoiced" value={cad.format(invoices.total_invoiced)} accent />
        <StatCard label="Invoices" value={invoices.count} />
        <StatCard label="HST Collected" value={cad.format(invoices.tax_collected)} />
      </div>
      {kinds.length > 0 && (
        <div className="mt-4 space-y-1.5">
          {kinds.map(([kind, total]) => (
            <div key={kind} className="flex justify-between text-sm">
              <span className="text-[#5f6268]">{KIND_LABEL[kind] ?? kind}</span>
              <span className="font-semibold text-[#101217]">{cad.format(total)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function RevenueTrend({ trend }: { trend: { date: string; revenue: number }[] }) {
  const max = Math.max(1, ...trend.map((d) => d.revenue))

  return (
    <div className="rounded-xl border border-black/8 bg-white p-5">
      <h2 className="text-sm font-semibold text-[#101217] mb-4">Revenue Trend</h2>
      {trend.length === 0 ? (
        <p className="text-sm text-[#5f6268] py-8 text-center">
          No completed bookings in this period yet.
        </p>
      ) : (
        <div className="flex items-end gap-1 h-48">
          {trend.map((d) => (
            <div key={d.date} className="group relative flex h-full flex-1 items-end justify-center min-w-0">
              <div
                className="w-full max-w-8 rounded-t transition-all"
                style={{
                  height: `${Math.max((d.revenue / max) * 100, d.revenue > 0 ? 2 : 0)}%`,
                  background: "#c96c83",
                }}
                title={`${d.date}: ${cad.format(d.revenue)}`}
              />
              <span className="pointer-events-none absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-[#101217] px-1.5 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                {cad.format(d.revenue)}
              </span>
            </div>
          ))}
        </div>
      )}
      {trend.length > 0 && (
        <div className="mt-2 flex justify-between text-[10px] text-[#5f6268]">
          <span>{trend[0].date}</span>
          <span>{trend[trend.length - 1].date}</span>
        </div>
      )}
    </div>
  )
}

function EmployeeLeaderboard({ employees }: { employees: AnalyticsEmployee[] }) {
  return (
    <div className="rounded-xl border border-black/8 bg-white p-5">
      <h2 className="text-sm font-semibold text-[#101217] mb-4">Worker Performance</h2>
      {employees.length === 0 ? (
        <p className="text-sm text-[#5f6268] py-6 text-center">
          No completed bookings to rank yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[#5f6268] border-b border-black/8">
                <th className="pb-2 font-medium">Technician</th>
                <th className="pb-2 font-medium text-right">Completed</th>
                <th className="pb-2 font-medium text-right">Revenue</th>
                <th className="pb-2 font-medium text-right">Cancels</th>
                <th className="pb-2 font-medium text-right">Avg Rating</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e, i) => (
                <tr key={e.id} className="border-b border-black/5 last:border-0">
                  <td className="py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#5f6268] w-4">{i + 1}</span>
                      <div>
                        <div className="font-medium text-[#101217]">{e.name}</div>
                        {e.title && <div className="text-xs text-[#5f6268]">{e.title}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 text-right text-[#101217]">{e.bookings_completed}</td>
                  <td className="py-2.5 text-right font-semibold text-[#101217]">{cad.format(e.revenue)}</td>
                  <td className="py-2.5 text-right text-[#5f6268]">{e.cancellations}</td>
                  <td className="py-2.5 text-right text-[#101217]">
                    {e.average_rating != null ? (
                      <span className="inline-flex items-center gap-1">
                        <span style={{ color: "#d4a843" }}>★</span>
                        {e.average_rating.toFixed(1)}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function TopServices({ services }: { services: { name: string; bookings: number; revenue: number }[] }) {
  const max = Math.max(1, ...services.map((s) => s.revenue))

  return (
    <div className="rounded-xl border border-black/8 bg-white p-5">
      <h2 className="text-sm font-semibold text-[#101217] mb-4">Top Services</h2>
      {services.length === 0 ? (
        <p className="text-sm text-[#5f6268] py-6 text-center">No service sales in this period.</p>
      ) : (
        <div className="space-y-3">
          {services.map((s) => (
            <div key={s.name}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-[#101217] font-medium">{s.name}</span>
                <span className="text-[#5f6268] text-xs">
                  {s.bookings} booking{s.bookings === 1 ? "" : "s"} · {cad.format(s.revenue)}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-black/5 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(s.revenue / max) * 100}%`, background: "#c96c83" }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
