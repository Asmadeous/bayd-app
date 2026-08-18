"use client"

import { useState } from "react"
import { Repeat, CreditCard, CalendarClock, ChevronDown } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardPage } from "@/components/dashboard/dashboard-page"
import { DashboardPanel } from "@/components/dashboard/dashboard-panel"
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

const money = (v: string | number | null) => (v == null ? "—" : `$${Number(v).toFixed(2)}`)
const dt = (s: string) => new Date(s).toLocaleString("en-CA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })

export default function CustomerSubscriptionsPage() {
  const { data: subs = [], isLoading } = useSubscriptions()

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
  const pause = usePauseSubscription()
  const resume = useResumeSubscription()
  const cancel = useCancelSubscription()
  const skip = useSkipSubscription()
  const changeFreq = useChangeFrequency()
  const [showHistory, setShowHistory] = useState(false)
  const detail = useSubscription(showHistory ? s.id : null)

  const busy = pause.isPending || resume.isPending || cancel.isPending || skip.isPending || changeFreq.isPending
  const currentPreset = FREQUENCY_PRESETS.find((p) => p.unit === s.interval_unit && p.count === s.interval_count)

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
              <Button size="xs" variant="outline" disabled={busy} onClick={() => skip.mutate(s.id)}>Skip next</Button>
              <Button size="xs" variant="outline" disabled={busy} onClick={() => pause.mutate(s.id)}>Pause</Button>
            </>
          ) : (
            <Button size="xs" disabled={busy} onClick={() => resume.mutate(s.id)} style={{ background: "#5a9e5a", border: "none", color: "#fff" }}>Resume</Button>
          )}
          <Button size="xs" variant="outline" disabled={busy} onClick={() => { if (confirm("Cancel this subscription?")) cancel.mutate(s.id) }}>
            <span className="text-[#d4754a]">Cancel</span>
          </Button>
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
                changeFreq.mutate({ id: s.id, unit: preset.unit, count: preset.count })
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
                  <span className="text-[#5f6268]">{new Date(h.date).toLocaleDateString("en-CA")}</span>
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
