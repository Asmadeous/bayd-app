"use client"

import { useEffect, useState } from "react"
import { Repeat, CreditCard, CalendarClock, ChevronDown } from "lucide-react"
import { useToast } from "@/components/bayd-toast-provider"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardPage } from "@/components/dashboard/dashboard-page"
import { DashboardPanel } from "@/components/dashboard/dashboard-panel"
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
  useSubscriptions,
  useSubscription,
  usePauseSubscription,
  useResumeSubscription,
  useCancelSubscription,
  useSkipSubscription,
  useChangeFrequency,
  FREQUENCY_PRESETS,
  type Subscription,
} from "@/lib/hooks/use-subscriptions"
import { customerSubscriptionsSteps } from "@/lib/tours/customer-subscriptions-tour"

const money = (v: string | number | null) => {
  if (v == null) return "-"
  const amount = Number(v)
  return Number.isFinite(amount) ? `$${amount.toFixed(2)}` : "-"
}
const dt = (s: string | null) => {
  if (!s) return "-"
  const date = new Date(s)
  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleString("en-CA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
}

export default function CustomerSubscriptionsPage() {
  const { toast } = useToast()
  const { data: subs = [], isError, isLoading } = useSubscriptions()

  useEffect(() => {
    if (isError) {
      toast({
        title: "Subscriptions not loaded",
        description: "Could not load your subscriptions.",
        variant: "error",
      })
    }
  }, [isError, toast])

  return (
    <DashboardPage maxWidth="wide">
      <div data-tour="customer-subscriptions-header">
        <DashboardHeader title="Subscriptions" subtitle="Manage your recurring beauty services." />
      </div>

      {isLoading ? (
        <DashboardPanel>
          <p className="text-sm text-[#5f6268]">Loading subscriptions...</p>
        </DashboardPanel>
      ) : subs.length === 0 ? (
        <EmptyState
          icon={Repeat}
          title="No subscriptions yet"
          description="Choose a frequency when you book a service to start one."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2" data-tour="customer-subscriptions-list">
          {subs.map((s) => <SubscriptionCard key={s.id} subscription={s} />)}
        </div>
      )}

      <TutorialButton steps={customerSubscriptionsSteps} pageKey="customer-subscriptions" />
    </DashboardPage>
  )
}

function SubscriptionCard({ subscription: s }: { subscription: Subscription }) {
  const { toast } = useToast()
  const pause = usePauseSubscription()
  const resume = useResumeSubscription()
  const cancel = useCancelSubscription()
  const skip = useSkipSubscription()
  const changeFreq = useChangeFrequency()
  const [showHistory, setShowHistory] = useState(false)
  const detail = useSubscription(showHistory ? s.id : null)

  const busy = pause.isPending || resume.isPending || cancel.isPending || skip.isPending || changeFreq.isPending
  const currentPreset = FREQUENCY_PRESETS.find((p) => p.unit === s.interval_unit && p.count === s.interval_count)

  function mutateAction(
    mutation: typeof pause,
    id: number,
    successTitle: string,
    errorTitle: string,
    fallback: string,
  ) {
    mutation.mutate(id, {
      onSuccess: () => toast({ title: successTitle, variant: "success" }),
      onError: (error) => toast({
        title: errorTitle,
        description: getApiErrorMessage(error, fallback),
        variant: "error",
      }),
    })
  }

  useEffect(() => {
    if (detail.isError) {
      toast({
        title: "Subscription history not loaded",
        description: "Could not load billing history for this subscription.",
        variant: "error",
      })
    }
  }, [detail.isError, toast])

  return (
    <DashboardPanel>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Repeat className="size-4 text-[#c96c83]" />
          <h3 className="font-extrabold text-[#101217]">{s.service_name}</h3>
        </div>
        <StatusBadgeFor status={s.status} />
      </div>

      <div className="mt-3 space-y-1.5 text-sm text-[#5f6268]">
        <p className="inline-flex items-center gap-2"><CalendarClock className="size-3.5" /> {s.frequency_label}</p>
        {s.next_charge ? (
          <p>Next charge: <span className="text-[#101217] font-medium">{money(s.next_charge.amount)} on {dt(s.next_charge.on)}</span></p>
        ) : s.status === "active" ? (
          <p>Next visit: <span className="text-[#101217] font-medium">{dt(s.next_run_at)}</span></p>
        ) : null}
        {s.address_label && <p>{s.address_label}</p>}
        <p className="inline-flex items-center gap-2">
          <CreditCard className="size-3.5" /> {s.auto_charge ? "Auto-charged each visit" : "Pay per visit"}
        </p>
      </div>

      {s.status !== "cancelled" && (
        <div className="mt-4 flex flex-wrap gap-2">
          {s.status === "active" ? (
            <>
              <Button size="xs" variant="outline" disabled={busy} onClick={() => mutateAction(skip, s.id, "Next visit skipped", "Visit not skipped", "Could not skip the next visit.")}>Skip next</Button>
              <Button size="xs" variant="outline" disabled={busy} onClick={() => mutateAction(pause, s.id, "Subscription paused", "Subscription not paused", "Could not pause this subscription.")}>Pause</Button>
            </>
          ) : (
            <Button size="xs" disabled={busy} onClick={() => mutateAction(resume, s.id, "Subscription resumed", "Subscription not resumed", "Could not resume this subscription.")} style={{ background: "#5a9e5a", border: "none", color: "#fff" }}>Resume</Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="xs" variant="outline" disabled={busy}>
                <span className="text-[#d4754a]">Cancel</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancel subscription?</AlertDialogTitle>
                <AlertDialogDescription>
                  This stops future recurring visits for {s.service_name ?? "this service"}.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep subscription</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => mutateAction(cancel, s.id, "Subscription cancelled", "Subscription not cancelled", "Could not cancel this subscription.")}
                >
                  Cancel subscription
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {s.status !== "cancelled" && (
        <label className="mt-3 flex items-center gap-2 text-xs text-[#5f6268]">
          Frequency
          <Select
            value={currentPreset?.label ?? ""}
            disabled={busy}
            onValueChange={(value) => {
              const preset = FREQUENCY_PRESETS.find((frequency) => frequency.label === value)
              if (preset) {
                changeFreq.mutate(
                  { id: s.id, unit: preset.unit, count: preset.count },
                  {
                    onSuccess: () => toast({ title: "Frequency updated", variant: "success" }),
                    onError: (error) => toast({
                      title: "Frequency not updated",
                      description: getApiErrorMessage(error, "Could not update this subscription frequency."),
                      variant: "error",
                    }),
                  },
                )
              }
            }}
          >
            <SelectTrigger className="h-8 flex-1 text-sm">
              <SelectValue placeholder={s.frequency_label} />
            </SelectTrigger>
            <SelectContent>
              {FREQUENCY_PRESETS.map((preset) => (
                <SelectItem key={preset.label} value={preset.label}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      )}

      <button
        onClick={() => setShowHistory((v) => !v)}
        className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#c96c83]"
      >
        Billing history <ChevronDown className={`size-3.5 transition-transform ${showHistory ? "rotate-180" : ""}`} />
      </button>

      {showHistory && (
        <div className="mt-2 border-t border-black/8 pt-2">
          {!detail.data ? (
            <p className="text-xs text-[#5f6268]">Loading...</p>
          ) : detail.data.history && detail.data.history.length > 0 ? (
            <div className="divide-y divide-black/5">
              {detail.data.history.map((h) => (
                <div key={h.booking_id} className="flex items-center justify-between py-1.5 text-xs">
                  <span className="text-[#5f6268]">{dt(h.date)}</span>
                  <span className="text-[#101217]">{money(h.amount)}</span>
                  <span style={{ color: h.paid ? "#5a9e5a" : "#8a8d93" }}>{h.paid ? "Paid" : h.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#5f6268]">No appointments yet.</p>
          )}
        </div>
      )}
    </DashboardPanel>
  )
}

function getApiErrorMessage(error: unknown, fallback: string) {
  const data = (error as { response?: { data?: { error?: string; errors?: string[] } } })?.response?.data
  return data?.error ?? data?.errors?.join(", ") ?? fallback
}
