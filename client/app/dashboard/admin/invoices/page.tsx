"use client"

import { useState } from "react"
import { Download, FileText, Mail, Plus, Trash2 } from "lucide-react"
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
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
    <DashboardPage maxWidth="wide">
      <DashboardHeader
        title="Invoices"
        subtitle="All transactions across bookings, products, and gift cards."
        actions={
          <Button size="sm" onClick={() => setCreating((c) => !c)} style={{ background: "#c96c83", border: "none", color: "#fff" }}>
            <Plus className="size-4" /> Manual invoice
          </Button>
        }
      />

      <div className="grid gap-3 lg:grid-cols-2">
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
        <DashboardPanel>
          <p className="text-sm text-[#5f6268]">Loading invoices...</p>
        </DashboardPanel>
      ) : invoices.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No invoices found"
          description="Invoices matching the selected filters will appear here."
        />
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
    </DashboardPage>
  )
}

function Row({ invoice, onStatus, onDelete, onResend }: {
  invoice: Invoice
  onStatus: (s: string) => void
  onDelete: () => void
  onResend: () => void
}) {
  return (
    <DashboardPanel className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-extrabold text-[#101217]">{invoice.invoice_number}</span>
          <StatusBadgeFor status={invoice.status} />
          <span className="text-xs text-[#5f6268]">{invoice.source_label}</span>
          <span className="text-xs text-[#5f6268]">{invoice.customer?.name}</span>
        </div>
        <p className="text-xs text-[#5f6268] mt-0.5">
          {invoice.issued_at ? new Date(invoice.issued_at).toLocaleDateString("en-CA") : ""} · {cad(invoice.total)} {invoice.currency} · tax {cad(invoice.tax)}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Select onValueChange={(value) => onStatus(value ?? invoice.status)} value={invoice.status}>
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
        {invoice.has_pdf && (
          <Button size="xs" variant="outline" onClick={() => downloadInvoice(invoice.id, invoice.invoice_number, "admin")}>
            <Download className="size-3.5" />
          </Button>
        )}
        <Button size="xs" variant="outline" onClick={onResend} title="Re-email to customer"><Mail className="size-3.5" /></Button>
        <Button size="xs" variant="outline" onClick={onDelete}><Trash2 className="size-3.5 text-[#d4754a]" /></Button>
      </div>
    </DashboardPanel>
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
    <DashboardPanel className="space-y-3 border-[#c96c83]/30">
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
    </DashboardPanel>
  )
}

function Filter({ label, value, set, options }: { label: string; value: string; set: (v: string) => void; options: string[] }) {
  return (
    <DashboardToolbar>
      <ToolbarSection>
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#6b6f76]">{label}</span>
        <SegmentedControl>
      {["", ...options].map((o) => (
        <SegmentButton active={value === o} key={o || "all"} onClick={() => set(o)}>
          {o ? o.replace("_", " ") : "all"}
        </SegmentButton>
      ))}
        </SegmentedControl>
      </ToolbarSection>
    </DashboardToolbar>
  )
}
