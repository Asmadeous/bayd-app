"use client"

import { useState } from "react"
import { Trash2 } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Button } from "@/components/ui/button"
import {
  useAdminSubscriptions,
  useUpdateSubscription,
  useCancelSubscriptionAdmin,
  useDeleteSubscription,
} from "@/lib/hooks/use-admin"
import type { Subscription } from "@/lib/hooks/use-subscriptions"

const STATUSES = ["active", "paused", "cancelled"]
const UNITS = ["day", "week", "month", "year"]
const STATUS_COLOR: Record<string, string> = { active: "#5a9e5a", paused: "#d4a843", cancelled: "#8a8d93" }
const dt = (s: string) => new Date(s).toLocaleString("en-CA", { month: "short", day: "numeric", year: "numeric" })

export default function AdminSubscriptionsPage() {
  const [status, setStatus] = useState("")
  const [page, setPage] = useState(1)
  const { data, isLoading } = useAdminSubscriptions({ status: status || undefined, page })
  const update = useUpdateSubscription()
  const cancel = useCancelSubscriptionAdmin()
  const del = useDeleteSubscription()
  const subs = data?.data ?? []

  return (
    <div className="space-y-6">
      <DashboardHeader title="Subscriptions" subtitle="All recurring service plans" />

      <div className="flex gap-2">
        {["", ...STATUSES].map((s) => (
          <button
            key={s || "all"}
            onClick={() => { setStatus(s); setPage(1) }}
            className="rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors"
            style={status === s ? { background: "#101217", color: "#fff" } : { background: "white", color: "#5f6268", border: "1px solid #e5e5e5" }}
          >
            {s || "all"}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-sm text-[#5f6268]">Loading…</div>
      ) : subs.length === 0 ? (
        <div className="rounded-xl border border-black/8 bg-white px-5 py-12 text-center text-sm text-[#5f6268]">No subscriptions found.</div>
      ) : (
        <div className="space-y-3">
          {subs.map((s) => (
            <Row key={s.id} subscription={s}
              onSaveFreq={(unit, count) => update.mutate({ id: s.id, interval_unit: unit, interval_count: count })}
              onStatus={(st) => update.mutate({ id: s.id, status: st })}
              onCancel={() => cancel.mutate(s.id)}
              onDelete={() => { if (confirm("Delete this subscription?")) del.mutate(s.id) }}
            />
          ))}
        </div>
      )}

      {data?.pagination && data.pagination.total_pages > 1 && (
        <div className="flex items-center gap-3 justify-end">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
          <span className="text-sm text-[#5f6268]">{page} / {data.pagination.total_pages}</span>
          <Button variant="outline" size="sm" disabled={!data.pagination.next_page} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  )
}

function Row({ subscription: s, onSaveFreq, onStatus, onCancel, onDelete }: {
  subscription: Subscription
  onSaveFreq: (unit: string, count: number) => void
  onStatus: (status: string) => void
  onCancel: () => void
  onDelete: () => void
}) {
  const [unit, setUnit] = useState(s.interval_unit)
  const [count, setCount] = useState(String(s.interval_count))
  const color = STATUS_COLOR[s.status] ?? "#8a8d93"
  const dirty = unit !== s.interval_unit || Number(count) !== s.interval_count

  return (
    <div className="rounded-xl border border-black/8 bg-white px-5 py-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-[#101217]">{s.service_name}</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium capitalize" style={{ background: `${color}22`, color }}>{s.status}</span>
            <span className="text-xs text-[#5f6268]">{s.customer?.name}</span>
          </div>
          <p className="text-xs text-[#5f6268] mt-0.5">
            {s.frequency_label} · next {dt(s.next_run_at)}
            {s.auto_charge ? ` · auto-pay${s.price ? ` $${Number(s.price).toFixed(2)}` : ""}` : " · pay per visit"}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <select value={s.status} onChange={(e) => onStatus(e.target.value)}
            className="h-8 border rounded-lg px-2 text-xs capitalize focus:outline-none" style={{ borderColor: `${color}55`, color }}>
            {STATUSES.map((st) => <option key={st} value={st}>{st}</option>)}
          </select>
          {s.status !== "cancelled" && <Button size="xs" variant="outline" onClick={onCancel}>Cancel</Button>}
          <Button size="xs" variant="outline" onClick={onDelete}><Trash2 className="size-3.5 text-[#d4754a]" /></Button>
        </div>
      </div>

      {/* Edit frequency */}
      <div className="mt-3 flex items-end gap-2">
        <span className="text-xs text-[#5f6268]">Every</span>
        <input value={count} onChange={(e) => setCount(e.target.value)} className="h-8 w-16 border border-black/15 rounded-lg px-2 text-sm focus:outline-none focus:border-[#c96c83]" />
        <select value={unit} onChange={(e) => setUnit(e.target.value as Subscription["interval_unit"])}
          className="h-8 border border-black/15 rounded-lg px-2 text-sm focus:outline-none focus:border-[#c96c83]">
          {UNITS.map((u) => <option key={u} value={u}>{u}{Number(count) === 1 ? "" : "s"}</option>)}
        </select>
        <Button size="xs" disabled={!dirty || !Number(count)} onClick={() => onSaveFreq(unit, Number(count))}
          style={{ background: "#c96c83", border: "none", color: "#fff" }}>
          Save
        </Button>
      </div>
    </div>
  )
}
