"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { StatCard } from "@/components/dashboard/stat-card"
import {
  useAdminEmployeeAnalytics,
  type AnalyticsPeriod,
} from "@/lib/hooks/use-admin"

const cad = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 })

const PERIODS: { key: AnalyticsPeriod; label: string }[] = [
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
  { key: "ytd", label: "Year" },
  { key: "all", label: "All time" },
]

export function EmployeeKpiDetail({ id }: { id: string }) {
  const [period, setPeriod] = useState<AnalyticsPeriod>("30d")
  const { data, isLoading } = useAdminEmployeeAnalytics(id, period)
  const s = data?.summary

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/admin/employees"
        className="inline-flex items-center gap-2 text-sm font-semibold text-[#5f6268] transition-colors hover:text-[#c96c83]"
      >
        <ArrowLeft className="size-4" /> All employees
      </Link>

      <DashboardHeader
        title={data?.employee.name ?? "Technician"}
        subtitle={data?.employee.title ?? "Performance KPIs"}
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

      {isLoading || !data ? (
        <div className="text-sm text-[#5f6268]">Loading…</div>
      ) : (
        <>
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Revenue" value={cad.format(s!.revenue)} accent />
            <StatCard label="Completed" value={s!.completed_bookings} />
            <StatCard
              label="Avg Rating"
              value={s!.average_rating != null ? s!.average_rating.toFixed(1) : "—"}
              sub={`${s!.reviews_count} review${s!.reviews_count === 1 ? "" : "s"}`}
            />
            <StatCard
              label="Completion"
              value={s!.completion_rate != null ? `${Math.round(s!.completion_rate * 100)}%` : "—"}
              sub={`${s!.cancellations} cancel · ${s!.no_shows} no-show`}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RatingBreakdown breakdown={data.rating_breakdown} total={s!.reviews_count} />
            <RevenueTrend trend={data.revenue_trend} />
          </div>

          <TopServices services={data.top_services} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Upcoming items={data.upcoming} count={s!.upcoming_count} />
            <RecentReviews reviews={data.recent_reviews} />
          </div>
        </>
      )}
    </div>
  )
}

function RatingBreakdown({ breakdown, total }: { breakdown: Record<string, number>; total: number }) {
  return (
    <div className="rounded-xl border border-black/8 bg-white p-5">
      <h2 className="text-sm font-semibold text-[#101217] mb-4">Rating Breakdown</h2>
      {total === 0 ? (
        <p className="text-sm text-[#5f6268] py-4 text-center">No reviews yet.</p>
      ) : (
        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map((star) => {
            const n = breakdown[String(star)] ?? 0
            const pct = total ? (n / total) * 100 : 0
            return (
              <div key={star} className="flex items-center gap-3 text-xs">
                <span className="w-8 text-[#5f6268]">{star}★</span>
                <div className="flex-1 h-2 rounded-full bg-black/5 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "#d4a843" }} />
                </div>
                <span className="w-6 text-right text-[#101217] font-medium">{n}</span>
              </div>
            )
          })}
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
        <p className="text-sm text-[#5f6268] py-4 text-center">No completed bookings in this period.</p>
      ) : (
        <div className="flex items-end gap-1 h-40">
          {trend.map((d) => (
            <div key={d.date} className="flex h-full flex-1 items-end justify-center min-w-0" title={`${d.date}: ${cad.format(d.revenue)}`}>
              <div
                className="w-full max-w-8 rounded-t"
                style={{ height: `${Math.max((d.revenue / max) * 100, d.revenue > 0 ? 2 : 0)}%`, background: "#c96c83" }}
              />
            </div>
          ))}
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
        <p className="text-sm text-[#5f6268] py-4 text-center">No service sales in this period.</p>
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
                <div className="h-full rounded-full" style={{ width: `${(s.revenue / max) * 100}%`, background: "#c96c83" }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Upcoming({ items, count }: { items: { id: number; service_name: string | null; client_name: string; starts_at: string; total: number }[]; count: number }) {
  return (
    <div className="rounded-xl border border-black/8 bg-white p-5">
      <h2 className="text-sm font-semibold text-[#101217] mb-4">Upcoming Schedule ({count})</h2>
      {items.length === 0 ? (
        <p className="text-sm text-[#5f6268] py-4 text-center">No upcoming appointments.</p>
      ) : (
        <div className="divide-y divide-black/5">
          {items.map((b) => (
            <div key={b.id} className="flex items-center justify-between py-2.5">
              <div>
                <p className="text-sm text-[#101217]">{b.service_name}</p>
                <p className="text-xs text-[#5f6268]">
                  {b.client_name} · {new Date(b.starts_at).toLocaleString("en-CA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <span className="text-sm font-semibold text-[#101217]">{cad.format(b.total)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function RecentReviews({ reviews }: { reviews: { id: number; rating: number; body: string | null; reviewer_name: string; created_at: string }[] }) {
  return (
    <div className="rounded-xl border border-black/8 bg-white p-5">
      <h2 className="text-sm font-semibold text-[#101217] mb-4">Recent Reviews</h2>
      {reviews.length === 0 ? (
        <p className="text-sm text-[#5f6268] py-4 text-center">No reviews yet.</p>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="border-b border-black/5 last:border-0 pb-3 last:pb-0">
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: "#d4a843" }}>{"★".repeat(r.rating)}<span className="text-black/15">{"★".repeat(5 - r.rating)}</span></span>
                <span className="text-xs text-[#5f6268]">{new Date(r.created_at).toLocaleDateString("en-CA")}</span>
              </div>
              {r.body && <p className="text-sm text-[#4f535a] mt-1">{r.body}</p>}
              <p className="text-xs text-[#5f6268] mt-1">{r.reviewer_name}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
