"use client"

import { Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"

import { formatBookingDate, formatBookingDateTime } from "@/lib/booking-time"
import { useAdminEmployeeAnalytics, type AnalyticsPeriod, type EmployeeAnalytics } from "@/lib/hooks/use-admin"
import { formatMoney } from "@/lib/stores/franchise-store"
import { cn } from "@/lib/utils"
import { AdminHeader } from "../../admin-header"
import { adminScreenClass, cardClass, displayClass, eyebrowClass, mutedClass } from "../../admin-theme"
import { FilterChips } from "../../ui"

const PERIODS = ["7d", "30d", "90d", "ytd", "all"] as const
const PERIOD_LABEL: Record<string, string> = { "7d": "7 days", "30d": "30 days", "90d": "90 days", ytd: "Year", all: "All time" }
const money = (value: number) => formatMoney(value, { maximumFractionDigits: 0 })

export default function AdminEmployeeKpiScreen() {
  // useSearchParams needs a Suspense boundary for the static export.
  return (
    <Suspense>
      <KpiDetail />
    </Suspense>
  )
}

// The web "View detailed KPIs" page for one technician.
function KpiDetail() {
  const id = Number(useSearchParams().get("id"))
  const [period, setPeriod] = useState<AnalyticsPeriod>("30d")
  const { data, isLoading } = useAdminEmployeeAnalytics(id > 0 ? id : "", period)
  const s = data?.summary

  return (
    <div className={adminScreenClass}>
      <AdminHeader back title="KPIs" />
      <div className="space-y-4 px-5">
        <div>
          <p className={`${displayClass} text-2xl`}>{data?.employee.name ?? "Technician"}</p>
          <p className={`text-sm ${mutedClass}`}>{data?.employee.title ?? "Performance KPIs"}</p>
        </div>
        <FilterChips options={PERIODS} value={period} onChange={setPeriod} label={(p) => PERIOD_LABEL[p]} />

        {isLoading || !data || !s ? (
          <p className={`text-sm ${mutedClass}`}>Loading…</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Revenue" value={money(s.revenue)} accent />
              <Stat label="Completed" value={s.completed_bookings} />
              <Stat
                label="Avg Rating"
                value={s.average_rating != null ? s.average_rating.toFixed(1) : "-"}
                sub={`${s.reviews_count} review${s.reviews_count === 1 ? "" : "s"}`}
              />
              <Stat
                label="Completion"
                value={s.completion_rate != null ? `${Math.round(s.completion_rate * 100)}%` : "-"}
                sub={`${s.cancellations} cancel · ${s.no_shows} no-show`}
              />
            </div>
            <RatingBreakdown breakdown={data.rating_breakdown} total={s.reviews_count} />
            <RevenueTrend trend={data.revenue_trend} />
            <TopServices services={data.top_services} />
            <Upcoming items={data.upcoming} count={s.upcoming_count} />
            <RecentReviews reviews={data.recent_reviews} />
          </>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <div className={cn(cardClass, "p-4", accent && "bg-[#14100F] text-white")}>
      <p className={`text-xs font-bold uppercase tracking-wide ${accent ? "text-white/70" : mutedClass}`}>{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
      {sub ? <p className={`mt-0.5 text-xs ${accent ? "text-white/70" : mutedClass}`}>{sub}</p> : null}
    </div>
  )
}

function Section({ title, empty, children }: { title: string; empty?: string; children?: React.ReactNode }) {
  return (
    <section className={`${cardClass} p-5`}>
      <p className={`${eyebrowClass} mb-3`}>{title}</p>
      {empty ? <p className={`py-3 text-center text-sm ${mutedClass}`}>{empty}</p> : children}
    </section>
  )
}

function RatingBreakdown({ breakdown, total }: { breakdown: Record<string, number>; total: number }) {
  return (
    <Section title="Rating Breakdown" empty={total === 0 ? "No reviews yet." : undefined}>
      <div className="space-y-2">
        {[5, 4, 3, 2, 1].map((star) => {
          const n = breakdown[String(star)] ?? 0
          return (
            <div key={star} className="flex items-center gap-3 text-sm">
              <span className={`w-8 ${mutedClass}`}>{star}★</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/5">
                <div className="h-full rounded-full bg-[#d4a843]" style={{ width: `${total ? (n / total) * 100 : 0}%` }} />
              </div>
              <span className="w-6 text-right font-semibold">{n}</span>
            </div>
          )
        })}
      </div>
    </Section>
  )
}

function RevenueTrend({ trend }: { trend: EmployeeAnalytics["revenue_trend"] }) {
  const max = Math.max(1, ...trend.map((d) => d.revenue))
  return (
    <Section title="Revenue Trend" empty={trend.length === 0 ? "No completed bookings in this period." : undefined}>
      <div className="flex h-36 items-end gap-1">
        {trend.map((d) => (
          <div key={d.date} className="flex h-full min-w-0 flex-1 items-end justify-center" aria-label={`${d.date}: ${money(d.revenue)}`}>
            <div className="w-full max-w-8 rounded-t bg-[#C96C83]" style={{ height: `${Math.max((d.revenue / max) * 100, d.revenue > 0 ? 2 : 0)}%` }} />
          </div>
        ))}
      </div>
    </Section>
  )
}

function TopServices({ services }: { services: EmployeeAnalytics["top_services"] }) {
  const max = Math.max(1, ...services.map((s) => s.revenue))
  return (
    <Section title="Top Services" empty={services.length === 0 ? "No service sales in this period." : undefined}>
      <div className="space-y-3">
        {services.map((s) => (
          <div key={s.name}>
            <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
              <span className="font-semibold">{s.name}</span>
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
    </Section>
  )
}

function Upcoming({ items, count }: { items: EmployeeAnalytics["upcoming"]; count: number }) {
  return (
    <Section title={`Upcoming Schedule (${count})`} empty={items.length === 0 ? "No upcoming appointments." : undefined}>
      <div className="divide-y divide-black/5">
        {items.map((b) => (
          <div key={b.id} className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{b.service_name}</p>
              <p className={`text-xs ${mutedClass}`}>
                {b.client_name} · {formatBookingDateTime(b.starts_at)}
              </p>
            </div>
            <span className="shrink-0 text-sm font-bold">{money(b.total)}</span>
          </div>
        ))}
      </div>
    </Section>
  )
}

function RecentReviews({ reviews }: { reviews: EmployeeAnalytics["recent_reviews"] }) {
  return (
    <Section title="Recent Reviews" empty={reviews.length === 0 ? "No reviews yet." : undefined}>
      <div className="space-y-3">
        {reviews.map((r) => (
          <div key={r.id} className="border-b border-black/5 pb-3 last:border-0 last:pb-0">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#d4a843]">
                {"★".repeat(r.rating)}
                <span className="text-black/15">{"★".repeat(5 - r.rating)}</span>
              </span>
              <span className={`text-xs ${mutedClass}`}>{formatBookingDate(r.created_at, { month: "short", day: "numeric", year: "numeric" })}</span>
            </div>
            {r.body ? <p className="mt-1 text-sm">{r.body}</p> : null}
            <p className={`mt-1 text-xs ${mutedClass}`}>{r.reviewer_name}</p>
          </div>
        ))}
      </div>
    </Section>
  )
}
