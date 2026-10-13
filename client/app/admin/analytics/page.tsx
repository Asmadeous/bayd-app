"use client"

import { useState } from "react"

import { useAdminAnalytics, type AnalyticsEmployee, type AnalyticsInvoices, type AnalyticsPeriod } from "@/lib/hooks/use-admin"
import { formatMoney, useFranchiseStore } from "@/lib/stores/franchise-store"
import { cn } from "@/lib/utils"
import { AdminHeader } from "../admin-header"
import { adminScreenClass, cardClass, displayClass, eyebrowClass, mutedClass } from "../admin-theme"

const PERIODS: { key: AnalyticsPeriod; label: string }[] = [
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
  { key: "ytd", label: "Year to date" },
  { key: "all", label: "All time" },
]

// Whole amounts in the franchise's currency.
const money = (value: number) => formatMoney(value, { maximumFractionDigits: 0 })

// The web Analytics page: sales and worker KPIs for a period.
export default function AdminAnalyticsScreen() {
  const [period, setPeriod] = useState<AnalyticsPeriod>("30d")
  const { data, isLoading } = useAdminAnalytics(period)
  const s = data?.summary

  return (
    <div className={adminScreenClass}>
      <AdminHeader title="Analytics" />
      <p className={`px-5 pb-3 text-sm ${mutedClass}`}>Sales performance and worker KPIs.</p>
      <div className="space-y-4 px-5">
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriod(p.key)}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-2 text-sm font-bold",
                period === p.key ? "bg-[#14100F] text-white" : "bg-white text-[#14100F]/70 shadow-sm",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <p className={`text-sm ${mutedClass}`}>Loading analytics…</p>
        ) : !data || !s ? (
          <p className={`text-sm ${mutedClass}`}>No analytics available.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Metric label="Total revenue" value={money(s.total_revenue)} accent />
              <Metric label="Service revenue" value={money(s.service_revenue)} />
              <Metric label="Product revenue" value={money(s.product_revenue)} />
              <Metric label="Completed bookings" value={s.completed_bookings} />
              <Metric label="New customers" value={s.new_customers} />
              <Metric
                label="Avg rating"
                value={s.average_rating != null ? s.average_rating.toFixed(1) : "-"}
                detail={s.completion_rate != null ? `${Math.round(s.completion_rate * 100)}% completion rate` : undefined}
              />
            </div>
            <RevenueTrend trend={data.revenue_trend} />
            {data.invoices ? <Invoices invoices={data.invoices} /> : null}
            <Workers employees={data.employees} />
            <TopServices services={data.top_services} />
          </>
        )}
      </div>
    </div>
  )
}

function Metric({ label, value, detail, accent = false }: { label: string; value: string | number; detail?: string; accent?: boolean }) {
  return (
    <div className={`${cardClass} p-4`}>
      <p className={`text-xs font-bold uppercase tracking-[0.1em] ${mutedClass}`}>{label}</p>
      <p className={`${displayClass} mt-1.5 text-2xl leading-none ${accent ? "text-[#C96C83]" : ""}`}>{value}</p>
      {detail ? <p className={`mt-1 text-xs ${mutedClass}`}>{detail}</p> : null}
    </div>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={`${cardClass} p-4`}>
      <p className={`${eyebrowClass} mb-3`}>{title}</p>
      {children}
    </section>
  )
}

function RevenueTrend({ trend }: { trend: { date: string; revenue: number }[] }) {
  const max = Math.max(1, ...trend.map((d) => d.revenue))
  return (
    <Panel title="Revenue trend">
      {trend.length === 0 ? (
        <p className={`py-6 text-center text-sm ${mutedClass}`}>No completed bookings in this period yet.</p>
      ) : (
        <>
          <div className="flex h-36 items-end gap-0.5">
            {trend.map((d) => (
              <div key={d.date} className="flex h-full min-w-0 flex-1 items-end justify-center">
                <div
                  className="w-full max-w-8 rounded-t bg-[#C96C83]"
                  style={{ height: `${Math.max((d.revenue / max) * 100, d.revenue > 0 ? 2 : 0)}%` }}
                  aria-label={`${d.date}: ${money(d.revenue)}`}
                />
              </div>
            ))}
          </div>
          <div className={`mt-2 flex justify-between text-xs ${mutedClass}`}>
            <span>{trend[0].date}</span>
            <span>{trend[trend.length - 1].date}</span>
          </div>
        </>
      )}
    </Panel>
  )
}

function Invoices({ invoices }: { invoices: AnalyticsInvoices }) {
  const taxName = useFranchiseStore((s) => s.config?.tax_name) ?? "Tax"
  const KIND: Record<string, string> = { booking: "Bookings", order: "Products", gift_card: "Gift cards", manual: "Manual" }
  const kinds = Object.entries(invoices.by_kind)
  return (
    <Panel title="Transactions / invoices">
      <div className="grid grid-cols-3 gap-2">
        <Metric label="Invoiced" value={money(invoices.total_invoiced)} accent />
        <Metric label="Invoices" value={invoices.count} />
        <Metric label={`${taxName} collected`} value={money(invoices.tax_collected)} />
      </div>
      {kinds.length ? (
        <div className="mt-3 space-y-1.5">
          {kinds.map(([kind, total]) => (
            <div key={kind} className="flex justify-between text-sm">
              <span className={mutedClass}>{KIND[kind] ?? kind}</span>
              <span className="font-semibold">{money(total)}</span>
            </div>
          ))}
        </div>
      ) : null}
    </Panel>
  )
}

function Workers({ employees }: { employees: AnalyticsEmployee[] }) {
  return (
    <Panel title="Worker performance">
      {employees.length === 0 ? (
        <p className={`py-4 text-center text-sm ${mutedClass}`}>No completed bookings to rank yet.</p>
      ) : (
        <ol className="divide-y divide-black/[0.06]">
          {employees.map((e, i) => (
            <li key={e.id} className="py-3">
              <div className="flex items-baseline justify-between gap-3">
                <p className="min-w-0 truncate text-base font-bold">
                  <span className={`mr-2 text-sm ${mutedClass}`}>{i + 1}</span>
                  {e.name}
                </p>
                <p className="shrink-0 text-base font-bold">{money(e.revenue)}</p>
              </div>
              {e.title ? <p className={`text-xs ${mutedClass}`}>{e.title}</p> : null}
              <p className={`mt-1 text-sm ${mutedClass}`}>
                {e.bookings_completed} completed · {e.cancellations} cancels · {e.missed} missed ·{" "}
                {e.average_rating != null ? `★ ${e.average_rating.toFixed(1)}` : "no rating"}
              </p>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  )
}

function TopServices({ services }: { services: { name: string; bookings: number; revenue: number }[] }) {
  const max = Math.max(1, ...services.map((s) => s.revenue))
  return (
    <Panel title="Top services">
      {services.length === 0 ? (
        <p className={`py-4 text-center text-sm ${mutedClass}`}>No service sales in this period.</p>
      ) : (
        <div className="space-y-3">
          {services.map((s) => (
            <div key={s.name}>
              <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate font-semibold">{s.name}</span>
                <span className={`shrink-0 text-xs ${mutedClass}`}>
                  {s.bookings} booking{s.bookings === 1 ? "" : "s"} · {money(s.revenue)}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-black/5">
                <div className="h-full rounded-full bg-[#C96C83]" style={{ width: `${(s.revenue / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  )
}
