"use client"

import { useState } from "react"
import { Trash2 } from "lucide-react"

import { StatusBadgeFor } from "@/components/dashboard/status-badge"
import { useConfirm, useToast } from "@/lib/app-ui/app-ui-provider"
import { useAdminSubscriptions, useCancelSubscriptionAdmin, useDeleteSubscription, useUpdateSubscription } from "@/lib/hooks/use-admin"
import type { Subscription } from "@/lib/hooks/use-subscriptions"
import { formatBookingDate } from "@/lib/booking-time"
import { formatMoney } from "@/lib/stores/franchise-store"
import { cn } from "@/lib/utils"
import { AdminHeader } from "../admin-header"
import { adminScreenClass, cardClass, mutedClass } from "../admin-theme"

const STATUSES = ["active", "paused", "cancelled"] as const
const UNITS = ["day", "week", "month", "year"] as const

function apiError(error: unknown, fallback: string) {
  const data = (error as { response?: { data?: { error?: string; errors?: string[] } } })?.response?.data
  return data?.error ?? data?.errors?.join(", ") ?? fallback
}

// The web Subscriptions page: every recurring plan, with status, frequency,
// cancel and delete.
export default function AdminSubscriptionsScreen() {
  const { toast } = useToast()
  const confirm = useConfirm()
  const [status, setStatus] = useState("")
  const [page, setPage] = useState(1)
  const { data, isLoading } = useAdminSubscriptions({ status: status || undefined, page })
  const update = useUpdateSubscription()
  const cancel = useCancelSubscriptionAdmin()
  const del = useDeleteSubscription()
  const subs = data?.data ?? []
  const busy = update.isPending || cancel.isPending || del.isPending

  function saveFrequency(s: Subscription, unit: string, count: number) {
    update.mutate(
      { id: s.id, interval_unit: unit, interval_count: count },
      {
        onSuccess: () => toast({ title: "Frequency saved", description: `${s.service_name ?? "Subscription"} was updated.`, variant: "success" }),
        onError: (e) => toast({ title: "Frequency not saved", description: apiError(e, "Could not update this subscription frequency."), variant: "error" }),
      },
    )
  }

  function saveStatus(s: Subscription, next: string) {
    update.mutate(
      { id: s.id, status: next },
      {
        onSuccess: () => toast({ title: "Subscription status saved", description: `Status changed to ${next}.`, variant: "success" }),
        onError: (e) => toast({ title: "Status not saved", description: apiError(e, "Could not update this subscription status."), variant: "error" }),
      },
    )
  }

  async function cancelPlan(s: Subscription) {
    const ok = await confirm({
      title: "Cancel subscription?",
      message: `This stops future recurring bookings for ${s.service_name ?? "this subscription"}. Existing bookings remain unchanged.`,
      confirmLabel: "Cancel subscription",
      cancelLabel: "Keep subscription",
      tone: "danger",
    })
    if (!ok) return
    cancel.mutate(s.id, {
      onSuccess: () => toast({ title: "Subscription cancelled", description: `${s.service_name ?? "Subscription"} will not schedule future visits.`, variant: "success" }),
      onError: (e) => toast({ title: "Subscription not cancelled", description: apiError(e, "Could not cancel this subscription."), variant: "error" }),
    })
  }

  async function deletePlan(s: Subscription) {
    const ok = await confirm({
      title: "Delete subscription?",
      message: `This permanently removes the subscription record for ${s.service_name ?? "this plan"}. Use cancel if the plan should remain in history.`,
      confirmLabel: "Delete subscription",
      tone: "danger",
    })
    if (!ok) return
    del.mutate(s.id, {
      onSuccess: () => toast({ title: "Subscription deleted", description: `${s.service_name ?? "Subscription"} was removed.`, variant: "success" }),
      onError: (e) => toast({ title: "Subscription not deleted", description: apiError(e, "Could not delete this subscription."), variant: "error" }),
    })
  }

  return (
    <div className={adminScreenClass}>
      <AdminHeader title="Subscriptions" />
      <p className={`px-5 pb-3 text-sm ${mutedClass}`}>All recurring service plans.</p>
      <div className="space-y-3 px-5">
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
          {["", ...STATUSES].map((s) => (
            <button
              key={s || "all"}
              type="button"
              onClick={() => { setStatus(s); setPage(1) }}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-2 text-sm font-bold capitalize",
                status === s ? "bg-[#14100F] text-white" : "bg-white text-[#14100F]/70 shadow-sm",
              )}
            >
              {s || "all"}
            </button>
          ))}
        </div>

        {isLoading ? (
          <p className={`text-sm ${mutedClass}`}>Loading subscriptions…</p>
        ) : subs.length === 0 ? (
          <div className={`${cardClass} p-5`}>
            <p className="text-base font-bold">No subscriptions found</p>
            <p className={`mt-1 text-sm ${mutedClass}`}>Recurring customer service plans will appear here.</p>
          </div>
        ) : (
          subs.map((s) => (
            <Plan
              key={s.id}
              subscription={s}
              busy={busy}
              onSaveFrequency={(unit, count) => saveFrequency(s, unit, count)}
              onStatus={(next) => saveStatus(s, next)}
              onCancel={() => cancelPlan(s)}
              onDelete={() => deletePlan(s)}
            />
          ))
        )}

        {data?.pagination && data.pagination.total_pages > 1 ? (
          <div className="flex items-center justify-between pt-1">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold shadow-sm disabled:opacity-40">
              Prev
            </button>
            <span className={`text-sm ${mutedClass}`}>
              {page} / {data.pagination.total_pages}
            </span>
            <button type="button" disabled={!data.pagination.next_page} onClick={() => setPage((p) => p + 1)} className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold shadow-sm disabled:opacity-40">
              Next
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function Plan({
  subscription: s,
  busy,
  onSaveFrequency,
  onStatus,
  onCancel,
  onDelete,
}: {
  subscription: Subscription
  busy: boolean
  onSaveFrequency: (unit: string, count: number) => void
  onStatus: (status: string) => void
  onCancel: () => void
  onDelete: () => void
}) {
  const [unit, setUnit] = useState<string>(s.interval_unit)
  const [count, setCount] = useState(String(s.interval_count))
  const parsed = Number(count)
  const countError = !count.trim() ? "Required." : !Number.isInteger(parsed) ? "Use a whole number." : parsed <= 0 ? "Must be greater than 0." : null
  const dirty = unit !== s.interval_unit || parsed !== s.interval_count
  const next = new Date(s.next_run_at)
  const nextLabel = Number.isNaN(next.getTime()) ? "not scheduled" : formatBookingDate(s.next_run_at, { month: "short", day: "numeric", year: "numeric" })
  const fieldClass = "h-10 rounded-xl border border-black/10 bg-white px-3 text-base outline-none focus:border-[#C96C83]"

  return (
    <section className={`${cardClass} space-y-3 p-4`}>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-base font-bold">{s.service_name}</span>
          <StatusBadgeFor status={s.status} />
        </div>
        {s.customer?.name ? <p className={`mt-0.5 text-sm ${mutedClass}`}>{s.customer.name}</p> : null}
        <p className={`mt-0.5 text-sm ${mutedClass}`}>
          {s.frequency_label} · next {nextLabel}
          {s.auto_charge ? ` · auto-pay${s.price ? ` ${formatMoney(Number(s.price))}` : ""}` : " · pay per visit"}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select aria-label="Status" disabled={busy} value={s.status} onChange={(e) => onStatus(e.target.value)} className={`${fieldClass} capitalize`}>
          {STATUSES.map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>
        {s.status !== "cancelled" ? (
          <button type="button" disabled={busy} onClick={onCancel} className="h-10 rounded-xl border border-black/10 bg-white px-4 text-sm font-bold disabled:opacity-40">
            Cancel
          </button>
        ) : null}
        <button type="button" disabled={busy} onClick={onDelete} aria-label="Delete subscription" className="grid size-10 place-items-center rounded-xl border border-black/10 bg-white disabled:opacity-40">
          <Trash2 className="size-4 text-[#d4754a]" aria-hidden />
        </button>
      </div>

      <div className="flex flex-wrap items-start gap-2">
        <span className={`pt-2 text-sm ${mutedClass}`}>Every</span>
        <div>
          <input
            aria-label="How many"
            aria-invalid={Boolean(countError)}
            inputMode="numeric"
            value={count}
            onChange={(e) => setCount(e.target.value)}
            className={`${fieldClass} w-16 ${countError ? "border-[#b75c68]" : ""}`}
          />
          {countError ? <p className="mt-1 text-xs font-semibold text-[#b75c68]">{countError}</p> : null}
        </div>
        <select aria-label="Unit" disabled={busy} value={unit} onChange={(e) => setUnit(e.target.value)} className={fieldClass}>
          {UNITS.map((u) => (
            <option key={u} value={u}>
              {u}
              {parsed === 1 ? "" : "s"}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={busy || !dirty || Boolean(countError)}
          onClick={() => onSaveFrequency(unit, parsed)}
          className="h-10 rounded-xl bg-[#C96C83] px-4 text-sm font-bold text-white disabled:opacity-40"
        >
          Save
        </button>
      </div>
    </section>
  )
}
