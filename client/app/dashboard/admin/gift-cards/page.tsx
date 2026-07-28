"use client"

import { useState } from "react"
import { Plus, Send, Trash2 } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { GiftCardVisual } from "@/components/gift-card-visual"
import { Button } from "@/components/ui/button"
import {
  useAdminGiftCards,
  useSaveGiftCard,
  useDeleteGiftCard,
  useDeliverGiftCard,
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
    <div className="space-y-6">
      <DashboardHeader
        title="Gift Cards"
        subtitle="Issue, manage, and send gift cards"
        actions={
          <Button size="sm" onClick={() => setCreating((v) => !v)} style={{ background: "#c96c83", border: "none", color: "#fff" }}>
            <Plus className="size-4" /> Issue card
          </Button>
        }
      />

      <div className="flex gap-2">
        {[["", "All"], ["true", "Active"], ["false", "Disabled"]].map(([v, l]) => (
          <button key={l} onClick={() => setActive(v)}
            className="rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
            style={active === v ? { background: "#101217", color: "#fff" } : { background: "white", color: "#5f6268", border: "1px solid #e5e5e5" }}>
            {l}
          </button>
        ))}
      </div>

      {creating && (
        <CreateForm
          saving={save.isPending}
          onCancel={() => setCreating(false)}
          onSave={async (d) => { await save.mutateAsync(d); setCreating(false) }}
        />
      )}

      {isLoading ? (
        <div className="text-sm text-[#5f6268]">Loading…</div>
      ) : cards.length === 0 ? (
        <div className="rounded-xl border border-black/8 bg-white px-5 py-12 text-center text-sm text-[#5f6268]">No gift cards yet.</div>
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
        <div className="flex items-center gap-3 justify-end">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
          <span className="text-sm text-[#5f6268]">{page} / {data.pagination.total_pages}</span>
          <Button variant="outline" size="sm" disabled={!data.pagination.next_page} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}
    </div>
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
  return (
    <div className="space-y-2">
      <GiftCardVisual code={card.code} balance={card.current_balance} expiresAt={card.expires_at} recipientName={card.recipient_name} active={card.active} />
      <div className="flex items-center justify-between gap-2 px-1">
        <span className="text-xs text-[#5f6268] truncate">{to ? `→ ${to}` : "No recipient"}{card.delivered_at ? " · sent" : ""}</span>
        <div className="flex gap-1.5 shrink-0">
          <Button size="xs" variant="outline" disabled={!to || sending} onClick={onSend} title={to ? "Send to recipient" : "Add a recipient email first"}>
            <Send className="size-3.5" />
          </Button>
          <Button size="xs" variant="outline" onClick={onToggle}>{card.active ? "Disable" : "Enable"}</Button>
          <Button size="xs" variant="outline" onClick={onDelete}><Trash2 className="size-3.5 text-[#d4754a]" /></Button>
        </div>
      </div>
    </div>
  )
}

function CreateForm({ saving, onSave, onCancel }: {
  saving: boolean
  onSave: (data: Record<string, unknown>) => void
  onCancel: () => void
}) {
  const [f, setF] = useState(BLANK)
  const field = "h-10 border border-black/15 rounded-lg px-3 text-sm focus:outline-none focus:border-[#c96c83]"
  const set = (k: keyof typeof BLANK, v: string) => setF((s) => ({ ...s, [k]: v }))

  return (
    <div className="rounded-xl border border-[#c96c83]/30 bg-white p-5 space-y-3">
      <div className="grid sm:grid-cols-3 gap-3">
        <input className={field} placeholder="Amount ($) *" value={f.initial_balance} onChange={(e) => set("initial_balance", e.target.value)} />
        <input className={field} type="date" value={f.expires_at} onChange={(e) => set("expires_at", e.target.value)} />
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
    </div>
  )
}
