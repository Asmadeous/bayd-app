"use client"

import { useState } from "react"
import { Repeat2, Trash2 } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardPage } from "@/components/dashboard/dashboard-page"
import { DashboardPanel } from "@/components/dashboard/dashboard-panel"
import {
  DashboardToolbar,
  SegmentedControl,
  SegmentButton,
  ToolbarSection,
} from "@/components/dashboard/dashboard-toolbar"
import { EmptyState } from "@/components/dashboard/empty-state"
import { StatusBadgeFor } from "@/components/dashboard/status-badge"
import { TutorialButton } from "@/components/dashboard/tutorial-button"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  useAdminSubscriptions,
  useUpdateSubscription,
  useCancelSubscriptionAdmin,
  useDeleteSubscription,
} from "@/lib/hooks/use-admin"
import type { Subscription } from "@/lib/hooks/use-subscriptions"
import { adminSubscriptionsSteps } from "@/lib/tours/admin-subscriptions-tour"

const STATUSES = ["active", "paused", "cancelled"]
const UNITS = ["day", "week", "month", "year"]
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
    <DashboardPage maxWidth="wide">
      <div data-tour="admin-subscriptions-header">
        <DashboardHeader title="Subscriptions" subtitle="All recurring service plans." />
      </div>

      <DashboardToolbar data-tour="admin-subscriptions-filter">
        <ToolbarSection>
          <SegmentedControl>
            {["", ...STATUSES].map((item) => (
              <SegmentButton
                active={status === item}
                key={item || "all"}
                onClick={() => { setStatus(item); setPage(1) }}
              >
                {item || "all"}
              </SegmentButton>
            ))}
          </SegmentedControl>
        </ToolbarSection>
      </DashboardToolbar>

      {isLoading ? (
        <DashboardPanel>
          <p className="text-sm text-[#5f6268]">Loading subscriptions...</p>
        </DashboardPanel>
      ) : subs.length === 0 ? (
        <EmptyState
          icon={Repeat2}
          title="No subscriptions found"
          description="Recurring customer service plans will appear here."
        />
      ) : (
        <div className="space-y-3" data-tour="admin-subscriptions-list">
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
        <DashboardToolbar className="justify-end">
          <ToolbarSection className="ml-auto">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
          <span className="px-2 text-sm font-semibold text-[#5f6268]">{page} / {data.pagination.total_pages}</span>
          <Button variant="outline" size="sm" disabled={!data.pagination.next_page} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </ToolbarSection>
        </DashboardToolbar>
      )}

      <TutorialButton steps={adminSubscriptionsSteps} pageKey="admin-subscriptions" />
    </DashboardPage>
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
  const dirty = unit !== s.interval_unit || Number(count) !== s.interval_count

  return (
    <DashboardPanel>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-extrabold text-[#101217]">{s.service_name}</span>
            <StatusBadgeFor status={s.status} />
            <span className="text-xs text-[#5f6268]">{s.customer?.name}</span>
          </div>
          <p className="text-xs text-[#5f6268] mt-0.5">
            {s.frequency_label} · next {dt(s.next_run_at)}
            {s.auto_charge ? ` · auto-pay${s.price ? ` $${Number(s.price).toFixed(2)}` : ""}` : " · pay per visit"}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Select onValueChange={(value) => onStatus(value ?? s.status)} value={s.status}>
            <SelectTrigger className="h-8 w-28 text-xs capitalize">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((status) => (
                <SelectItem className="capitalize" key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {s.status !== "cancelled" && <Button size="xs" variant="outline" onClick={onCancel}>Cancel</Button>}
          <Button size="xs" variant="outline" onClick={onDelete}><Trash2 className="size-3.5 text-[#d4754a]" /></Button>
        </div>
      </div>

      {/* Edit frequency */}
      <div className="mt-3 flex items-end gap-2">
        <span className="text-xs text-[#5f6268]">Every</span>
        <input value={count} onChange={(e) => setCount(e.target.value)} className="h-8 w-16 border border-black/15 rounded-lg px-2 text-sm focus:outline-none focus:border-[#c96c83]" />
        <Select
          onValueChange={(value) => setUnit((value ?? unit) as Subscription["interval_unit"])}
          value={unit}
        >
          <SelectTrigger className="h-8 w-28 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {UNITS.map((unitOption) => (
              <SelectItem key={unitOption} value={unitOption}>
                {unitOption}
                {Number(count) === 1 ? "" : "s"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="xs" disabled={!dirty || !Number(count)} onClick={() => onSaveFreq(unit, Number(count))}
          style={{ background: "#c96c83", border: "none", color: "#fff" }}>
          Save
        </Button>
      </div>
    </DashboardPanel>
  )
}
