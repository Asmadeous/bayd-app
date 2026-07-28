"use client"

import { useState } from "react"
import { Download, Mail, Plus, Trash2 } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Button } from "@/components/ui/button"
import {
  useAdminInvoices,
  useSaveInvoice,
  useDeleteInvoice,
  useResendInvoice,
} from "@/lib/hooks/use-admin"
import { downloadInvoice, type Invoice } from "@/lib/hooks/use-invoices"

const cad = (v: string | number) => `$${Number(v).toFixed(2)}`
const STATUSES = ["issued", "paid", "void", "refunded"]
const KINDS = ["booking", "order", "gift_card", "manual"]
const STATUS_COLOR: Record<string, string> = { paid: "#5a9e5a", issued: "#d4a843", void: "#8a8d93", refunded: "#d4754a" }

export default function AdminInvoicesPage() {
  const [status, setStatus] = useState("")
  const [kind, setKind] = useState("")
  const [creating, setCreating] = useState(false)
  const { data, isLoading } = useAdminInvoices({ status: status || undefined, kind: kind || undefined })
  const save = useSaveInvoice()
  const del = useDeleteInvoice()
  const resend = useResendInvoice()
  const invoices = data?.data ?? []

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Invoices"
        subtitle="All transactions across bookings, products, and gift cards"
        actions={
          <Button size="sm" onClick={() => setCreating((c) => !c)} style={{ background: "#c96c83", border: "none", color: "#fff" }}>
            <Plus className="size-4" /> Manual invoice
          </Button>
        }
      />

      <div className="flex gap-2 flex-wrap">
        <Filter label="Status" value={status} set={setStatus} options={STATUSES} />
        <Filter label="Type" value={kind} set={setKind} options={KINDS} />
      </div>

      {creating && (
        <ManualInvoiceForm
          saving={save.isPending}
          onCancel={() => setCreating(false)}
          onSave={async (d) => { await save.mutateAsync(d); setCreating(false) }}
        />
      )}

      {isLoading ? (
        <div className="text-sm text-[#5f6268]">Loading…</div>
      ) : invoices.length === 0 ? (
        <div className="rounded-xl border border-black/8 bg-white px-5 py-12 text-center text-sm text-[#5f6268]">No invoices found.</div>
      ) : (
        <div className="space-y-3">
          {invoices.map((inv) => (
            <Row key={inv.id} invoice={inv}
              onStatus={(s) => save.mutate({ id: inv.id, status: s })}
              onDelete={() => { if (confirm("Delete this invoice?")) del.mutate(inv.id) }}
              onResend={() => resend.mutate(inv.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function Row({ invoice, onStatus, onDelete, onResend }: {
  invoice: Invoice
  onStatus: (s: string) => void
  onDelete: () => void
  onResend: () => void
}) {
  const color = STATUS_COLOR[invoice.status] ?? "#8a8d93"
  return (
    <div className="rounded-xl border border-black/8 bg-white px-5 py-4 flex items-start justify-between gap-3 flex-wrap">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm text-[#101217]">{invoice.invoice_number}</span>
          <span className="text-xs text-[#5f6268]">{invoice.source_label}</span>
          <span className="text-xs text-[#5f6268]">{invoice.customer?.name}</span>
        </div>
        <p className="text-xs text-[#5f6268] mt-0.5">
          {invoice.issued_at ? new Date(invoice.issued_at).toLocaleDateString("en-CA") : ""} · {cad(invoice.total)} {invoice.currency} · tax {cad(invoice.tax)}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <select value={invoice.status} onChange={(e) => onStatus(e.target.value)}
          className="h-8 border rounded-lg px-2 text-xs capitalize focus:outline-none" style={{ borderColor: `${color}55`, color }}>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {invoice.has_pdf && (
          <Button size="xs" variant="outline" onClick={() => downloadInvoice(invoice.id, invoice.invoice_number, "admin")}>
            <Download className="size-3.5" />
          </Button>
        )}
        <Button size="xs" variant="outline" onClick={onResend} title="Re-email to customer"><Mail className="size-3.5" /></Button>
        <Button size="xs" variant="outline" onClick={onDelete}><Trash2 className="size-3.5 text-[#d4754a]" /></Button>
      </div>
    </div>
  )
}

function ManualInvoiceForm({ saving, onSave, onCancel }: {
  saving: boolean
  onSave: (data: Record<string, unknown>) => void
  onCancel: () => void
}) {
  const [f, setF] = useState({ user_id: "", description: "", subtotal: "", tax: "", total: "", payment_method: "card", notes: "" })
  const field = "h-10 border border-black/15 rounded-lg px-3 text-sm focus:outline-none focus:border-[#c96c83]"
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }))

  function submit() {
    onSave({
      user_id: Number(f.user_id),
      kind: "manual",
      status: "issued",
      payment_method: f.payment_method,
      subtotal: Number(f.subtotal || f.total || 0),
      tax: Number(f.tax || 0),
      total: Number(f.total || f.subtotal || 0),
      notes: f.notes,
      line_items: f.description ? [{ description: f.description, quantity: 1, unit_price: Number(f.total || 0), amount: Number(f.total || 0) }] : [],
    })
  }

  return (
    <div className="rounded-xl border border-[#c96c83]/30 bg-white p-5 space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <input className={field} placeholder="Customer user ID *" value={f.user_id} onChange={(e) => set("user_id", e.target.value)} />
        <input className={field} placeholder="Payment method" value={f.payment_method} onChange={(e) => set("payment_method", e.target.value)} />
        <input className={`${field} sm:col-span-2`} placeholder="Description" value={f.description} onChange={(e) => set("description", e.target.value)} />
        <input className={field} placeholder="Subtotal" value={f.subtotal} onChange={(e) => set("subtotal", e.target.value)} />
        <input className={field} placeholder="Tax" value={f.tax} onChange={(e) => set("tax", e.target.value)} />
        <input className={field} placeholder="Total *" value={f.total} onChange={(e) => set("total", e.target.value)} />
      </div>
      <input className={`${field} w-full`} placeholder="Notes" value={f.notes} onChange={(e) => set("notes", e.target.value)} />
      <div className="flex gap-2">
        <Button size="sm" disabled={saving || !f.user_id || !f.total} onClick={submit} style={{ background: "#c96c83", border: "none", color: "#fff" }}>
          {saving ? "Saving…" : "Create & email"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  )
}

function Filter({ label, value, set, options }: { label: string; value: string; set: (v: string) => void; options: string[] }) {
  return (
    <div className="flex gap-1.5 items-center">
      <span className="text-xs text-[#5f6268]">{label}:</span>
      {["", ...options].map((o) => (
        <button key={o || "all"} onClick={() => set(o)}
          className="rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors"
          style={value === o ? { background: "#101217", color: "#fff" } : { background: "white", color: "#5f6268", border: "1px solid #e5e5e5" }}>
          {o ? o.replace("_", " ") : "all"}
        </button>
      ))}
    </div>
  )
}
