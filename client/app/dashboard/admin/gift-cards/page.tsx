"use client"

import { useState } from "react"
import { Gift, Plus, Send, Trash2 } from "lucide-react"
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
import { GiftCardVisual } from "@/components/gift-card-visual"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  useAdminGiftCards,
  useSaveGiftCard,
  useDeleteGiftCard,
  useDeliverGiftCard,
  useTopupGiftCard,
} from "@/lib/hooks/use-admin"
import type { GiftCard } from "@/lib/hooks/use-gift-cards"

const BLANK = {
  initial_balance: "", expires_at: "", recipient_email: "", recipient_name: "", sender_name: "", message: "",
}

export default function AdminGiftCardsPage() {
  const [page, setPage] = useState(1)
  const [active, setActive] = useState("")
  const [creating, setCreating] = useState(false)
  const { data, isLoading } = useAdminGiftCards({ active: active || undefined, page })
  const save = useSaveGiftCard()
  const del = useDeleteGiftCard()
  const deliver = useDeliverGiftCard()
  const cards = data?.data ?? []

  return (
    <DashboardPage maxWidth="wide">
      <DashboardHeader
        title="Gift Cards"
        subtitle="Issue, manage, and send gift cards."
        actions={
          <Button size="sm" onClick={() => setCreating((v) => !v)} style={{ background: "#c96c83", border: "none", color: "#fff" }}>
            <Plus className="size-4" /> Issue card
          </Button>
        }
      />

      <DashboardToolbar>
        <ToolbarSection>
          <SegmentedControl>
        {[["", "All"], ["true", "Active"], ["false", "Disabled"]].map(([v, l]) => (
          <SegmentButton active={active === v} key={l} onClick={() => setActive(v)}>
            {l}
          </SegmentButton>
        ))}
          </SegmentedControl>
        </ToolbarSection>
      </DashboardToolbar>

      {creating && (
        <CreateForm
          saving={save.isPending}
          onCancel={() => setCreating(false)}
          onSave={async (d) => { await save.mutateAsync(d); setCreating(false) }}
        />
      )}

      {isLoading ? (
        <DashboardPanel>
          <p className="text-sm text-[#5f6268]">Loading gift cards...</p>
        </DashboardPanel>
      ) : cards.length === 0 ? (
        <EmptyState
          icon={Gift}
          title="No gift cards yet"
          description="Issued gift cards will appear here."
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <AdminCard key={c.id} card={c}
              onToggle={() => save.mutate({ id: c.id, active: !c.active })}
              onDelete={() => { if (confirm("Delete this gift card?")) del.mutate(c.id) }}
              onSend={() => deliver.mutate(c.id)}
              sending={deliver.isPending}
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
    </DashboardPage>
  )
}

function AdminCard({ card, onToggle, onDelete, onSend, sending }: {
  card: GiftCard
  onToggle: () => void
  onDelete: () => void
  onSend: () => void
  sending: boolean
}) {
  const to = card.recipient_email || card.purchaser?.email
  const topup = useTopupGiftCard()
  const [amount, setAmount] = useState("")
  const [method, setMethod] = useState("pos")

  function markPaid() {
    const value = Number(amount)
    if (!value || value <= 0) return
    topup.mutate({ id: card.id, amount: value, method }, { onSuccess: () => setAmount("") })
  }

  return (
    <DashboardPanel className="space-y-3 p-4">
      <GiftCardVisual code={card.code} balance={card.current_balance} expiresAt={card.expires_at} recipientName={card.recipient_name} active={card.active} />
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-[#5f6268] truncate">{to ? `→ ${to}` : "No recipient"}{card.delivered_at ? " · sent" : ""}</span>
        <div className="flex gap-1.5 shrink-0">
          <Button size="xs" variant="outline" disabled={!to || sending} onClick={onSend} title={to ? "Send to recipient" : "Add a recipient email first"}>
            <Send className="size-3.5" />
          </Button>
          <Button size="xs" variant="outline" onClick={onToggle}>{card.active ? "Disable" : "Enable"}</Button>
          <Button size="xs" variant="outline" onClick={onDelete}><Trash2 className="size-3.5 text-[#d4754a]" /></Button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 border-t border-black/8 px-1 pt-3">
        <input
          type="number" min="0" step="1" inputMode="decimal" placeholder="Top-up $"
          value={amount} onChange={(e) => setAmount(e.target.value)}
          className="h-9 w-28 border border-black/15 px-2 text-sm focus:border-[#c96c83] focus:outline-none"
        />
        <Select value={method} onValueChange={(value) => setMethod(value ?? "pos")}>
          <SelectTrigger className="h-9 w-28 px-2 text-xs">
            <SelectValue placeholder="Method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pos">POS</SelectItem>
            <SelectItem value="card">Card</SelectItem>
            <SelectItem value="cash">Cash</SelectItem>
          </SelectContent>
        </Select>
        <Button size="xs" variant="outline" disabled={topup.isPending || !amount} onClick={markPaid}>
          {topup.isPending ? "…" : "Mark paid"}
        </Button>
      </div>
    </DashboardPanel>
  )
}

function CreateForm({ saving, onSave, onCancel }: {
  saving: boolean
  onSave: (data: Record<string, unknown>) => void
  onCancel: () => void
}) {
  const [f, setF] = useState(BLANK)
  const today = new Date()
  const minExpirationDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
  const field = "h-11 border border-black/15 bg-white px-3 text-sm font-semibold text-[#101217] outline-none transition-colors placeholder:text-[#8a8d93] focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20"
  const set = (k: keyof typeof BLANK, v: string) => setF((s) => ({ ...s, [k]: v }))

  return (
    <DashboardPanel className="space-y-3 border-[#c96c83]/30">
      <div className="grid sm:grid-cols-3 gap-3">
        <input className={field} placeholder="Amount ($) *" value={f.initial_balance} onChange={(e) => set("initial_balance", e.target.value)} />
        <DatePicker
          min={minExpirationDate}
          placeholder="Expiration date"
          value={f.expires_at}
          onChange={(value) => set("expires_at", value)}
        />
        <input className={field} placeholder="Recipient email" value={f.recipient_email} onChange={(e) => set("recipient_email", e.target.value)} />
        <input className={field} placeholder="Recipient name" value={f.recipient_name} onChange={(e) => set("recipient_name", e.target.value)} />
        <input className={field} placeholder="From (sender name)" value={f.sender_name} onChange={(e) => set("sender_name", e.target.value)} />
        <input className={field} placeholder="Gift message" value={f.message} onChange={(e) => set("message", e.target.value)} />
      </div>
      <p className="text-xs text-[#8a8d93]">Code is auto-generated (BAYD-…). Adding a recipient email sends the card automatically.</p>
      <div className="flex gap-2">
        <Button size="sm" disabled={saving || !f.initial_balance} onClick={() => onSave(f)} style={{ background: "#c96c83", border: "none", color: "#fff" }}>
          {saving ? "Issuing…" : "Issue card"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </DashboardPanel>
  )
}
