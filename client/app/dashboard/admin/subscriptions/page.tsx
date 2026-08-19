"use client"

import { useState } from "react"
import { Repeat2, Trash2 } from "lucide-react"
import { useToast } from "@/components/bayd-toast-provider"
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
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
const dt = (s: string) => {
  const date = new Date(s)
  return Number.isNaN(date.getTime()) ? "not scheduled" : date.toLocaleString("en-CA", { month: "short", day: "numeric", year: "numeric" })
}

export default function AdminSubscriptionsPage() {
  const { toast } = useToast()
  const [status, setStatus] = useState("")
  const [page, setPage] = useState(1)
  const { data, isLoading } = useAdminSubscriptions({ status: status || undefined, page })
  const update = useUpdateSubscription()
  const cancel = useCancelSubscriptionAdmin()
  const del = useDeleteSubscription()
  const subs = data?.data ?? []

  function updateFrequency(subscription: Subscription, unit: string, count: number) {
    update.mutate(
      { id: subscription.id, interval_unit: unit, interval_count: count },
      {
        onSuccess: () => toast({ title: "Frequency saved", description: `${subscription.service_name ?? "Subscription"} was updated.`, variant: "success" }),
        onError: (error: unknown) => {
          toast({
            title: "Frequency not saved",
            description: getApiErrorMessage(error, "Could not update this subscription frequency."),
            variant: "error",
          })
        },
      }
    )
  }

  function updateStatus(subscription: Subscription, nextStatus: string) {
    update.mutate(
      { id: subscription.id, status: nextStatus },
      {
        onSuccess: () => toast({ title: "Subscription status saved", description: `Status changed to ${nextStatus}.`, variant: "success" }),
        onError: (error: unknown) => {
          toast({
            title: "Status not saved",
            description: getApiErrorMessage(error, "Could not update this subscription status."),
            variant: "error",
          })
        },
      }
    )
  }

  function cancelSubscription(subscription: Subscription) {
    cancel.mutate(subscription.id, {
      onSuccess: () => toast({ title: "Subscription cancelled", description: `${subscription.service_name ?? "Subscription"} will not schedule future visits.`, variant: "success" }),
      onError: (error: unknown) => {
        toast({
          title: "Subscription not cancelled",
          description: getApiErrorMessage(error, "Could not cancel this subscription."),
          variant: "error",
        })
      },
    })
  }

  function deleteSubscription(subscription: Subscription) {
    del.mutate(subscription.id, {
      onSuccess: () => toast({ title: "Subscription deleted", description: `${subscription.service_name ?? "Subscription"} was removed.`, variant: "success" }),
      onError: (error: unknown) => {
        toast({
          title: "Subscription not deleted",
          description: getApiErrorMessage(error, "Could not delete this subscription."),
          variant: "error",
        })
      },
    })
  }

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
              busy={update.isPending || cancel.isPending || del.isPending}
              onSaveFreq={(unit, count) => updateFrequency(s, unit, count)}
              onStatus={(st) => updateStatus(s, st)}
              onCancel={() => cancelSubscription(s)}
              onDelete={() => deleteSubscription(s)}
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

function Row({ subscription: s, busy, onSaveFreq, onStatus, onCancel, onDelete }: {
  subscription: Subscription
  busy: boolean
  onSaveFreq: (unit: string, count: number) => void
  onStatus: (status: string) => void
  onCancel: () => void
  onDelete: () => void
}) {
  const [unit, setUnit] = useState(s.interval_unit)
  const [count, setCount] = useState(String(s.interval_count))
  const parsedCount = Number(count)
  const countError = getCountError(count)
  const dirty = unit !== s.interval_unit || parsedCount !== s.interval_count

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
          <Select disabled={busy} onValueChange={(value) => onStatus(value ?? s.status)} value={s.status}>
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
          {s.status !== "cancelled" && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="xs" variant="outline" disabled={busy}>Cancel</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel subscription?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This stops future recurring bookings for {s.service_name ?? "this subscription"}. Existing bookings remain unchanged.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep subscription</AlertDialogCancel>
                  <AlertDialogAction onClick={onCancel}>Cancel subscription</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="xs" variant="outline" disabled={busy}>
                <Trash2 className="size-3.5 text-[#d4754a]" />
                <span className="sr-only">Delete subscription</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete subscription?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently removes the subscription record for {s.service_name ?? "this plan"}. Use cancel if the plan should remain in history.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete}>Delete subscription</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Edit frequency */}
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <span className="text-xs text-[#5f6268]">Every</span>
        <div>
          <input
            aria-invalid={Boolean(countError)}
            value={count}
            onChange={(e) => setCount(e.target.value)}
            className={`h-8 w-16 border px-2 text-sm outline-none transition focus:ring-3 ${countError ? "border-[#b75c68] focus:border-[#b75c68] focus:ring-[#b75c68]/20" : "border-black/15 focus:border-[#c96c83] focus:ring-[#c96c83]/20"}`}
          />
          {countError ? <p className="mt-1 text-xs font-semibold text-[#b75c68]">{countError}</p> : null}
        </div>
        <Select
          onValueChange={(value) => setUnit((value ?? unit) as Subscription["interval_unit"])}
          value={unit}
          disabled={busy}
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
        <Button size="xs" disabled={busy || !dirty || Boolean(countError)} onClick={() => onSaveFreq(unit, parsedCount)}
          style={{ background: "#c96c83", border: "none", color: "#fff" }}>
          Save
        </Button>
      </div>
    </DashboardPanel>
  )
}

function getCountError(value: string) {
  const count = Number(value)
  if (!value.trim()) return "Required."
  if (!Number.isInteger(count)) return "Use a whole number."
  if (count <= 0) return "Must be greater than 0."
  return null
}

function getApiErrorMessage(error: unknown, fallback: string) {
  const data = (error as { response?: { data?: { error?: string; errors?: string[] } } })?.response?.data
  return data?.error ?? data?.errors?.join(", ") ?? fallback
}
