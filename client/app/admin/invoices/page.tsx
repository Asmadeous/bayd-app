"use client"

import { useState } from "react"
import { Download, Mail, Plus, X } from "lucide-react"

import { ManualInvoiceDialog } from "@/components/dashboard/manual-invoice-dialog"
import { StatusBadgeFor } from "@/components/dashboard/status-badge"
import { InvoiceBreakdown } from "@/components/invoice/invoice-breakdown"
import { useConfirm, useToast } from "@/lib/app-ui/app-ui-provider"
import { formatBookingDate } from "@/lib/booking-time"
import { useAdminInvoices, useDeleteInvoice, useResendInvoice, useSaveInvoice } from "@/lib/hooks/use-admin"
import { downloadInvoice, type Invoice } from "@/lib/hooks/use-invoices"
import { formatMoney } from "@/lib/stores/franchise-store"
import { AdminHeader } from "../admin-header"
import { adminScreenClass, cardClass, eyebrowClass, mutedClass } from "../admin-theme"
import { apiError, EmptyCard, FilterChips } from "../ui"

const STATUSES = ["issued", "paid", "void", "refunded"] as const
const STATUS_FILTERS = ["", ...STATUSES] as const
const KIND_FILTERS = ["", "booking", "order", "gift_card", "manual"] as const

// The web Invoices page: every transaction by status and type, with status,
// view, PDF, re-email and delete, plus manual invoices.
export default function AdminInvoicesScreen() {
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>("")
  const [kind, setKind] = useState<(typeof KIND_FILTERS)[number]>("")
  const [creating, setCreating] = useState(false)
  const [viewing, setViewing] = useState<Invoice | null>(null)
  const { data, isLoading } = useAdminInvoices({ status: status || undefined, kind: kind || undefined })
  const invoices = data?.data ?? []

  return (
    <div className={adminScreenClass}>
      <AdminHeader
        title="Invoices"
        action={
          <button type="button" onClick={() => setCreating(true)} className="flex h-10 items-center gap-1 rounded-full bg-[#C96C83] px-4 text-sm font-bold text-white">
            <Plus className="size-4" aria-hidden /> Manual
          </button>
        }
      />
      <p className={`px-5 pb-3 text-sm ${mutedClass}`}>All transactions across bookings, products, and gift cards.</p>
      {creating ? <ManualInvoiceDialog onClose={() => setCreating(false)} /> : null}
      {viewing ? <InvoiceSheet invoice={viewing} onClose={() => setViewing(null)} /> : null}
      <div className="space-y-3 px-5">
        <p className={eyebrowClass}>Status</p>
        <FilterChips options={STATUS_FILTERS} value={status} onChange={setStatus} label={(s) => s || "all"} />
        <p className={eyebrowClass}>Type</p>
        <FilterChips options={KIND_FILTERS} value={kind} onChange={setKind} label={(k) => (k ? k.replace("_", " ") : "all")} />
        {isLoading ? (
          <p className={`text-sm ${mutedClass}`}>Loading invoices…</p>
        ) : invoices.length === 0 ? (
          <EmptyCard title="No invoices found" body="Invoices matching the selected filters will appear here." />
        ) : (
          invoices.map((inv) => <InvoiceCard key={inv.id} invoice={inv} onView={() => setViewing(inv)} />)
        )}
      </div>
    </div>
  )
}

function InvoiceCard({ invoice, onView }: { invoice: Invoice; onView: () => void }) {
  const { toast } = useToast()
  const confirm = useConfirm()
  const save = useSaveInvoice()
  const del = useDeleteInvoice()
  const resend = useResendInvoice()

  function setStatus(next: string) {
    save.mutate(
      { id: invoice.id, status: next },
      {
        onSuccess: () => toast({ title: "Invoice status saved", variant: "success" }),
        onError: (e) => toast({ title: "Invoice status not saved", description: apiError(e, "Could not update this invoice."), variant: "error" }),
      },
    )
  }

  async function remove() {
    const ok = await confirm({
      title: "Delete invoice?",
      message: `This will remove invoice ${invoice.invoice_number}. The customer will no longer see this invoice in their transactions.`,
      confirmLabel: "Delete invoice",
      tone: "danger",
    })
    if (!ok) return
    del.mutate(invoice.id, {
      onSuccess: () => toast({ title: "Invoice deleted", variant: "success" }),
      onError: (e) => toast({ title: "Invoice not deleted", description: apiError(e, "Could not delete this invoice."), variant: "error" }),
    })
  }

  async function download() {
    try {
      await downloadInvoice(invoice.id, invoice.invoice_number, "admin")
    } catch (e) {
      toast({ title: "PDF not downloaded", description: apiError(e, "Please try again."), variant: "error" })
    }
  }

  const button = "grid h-10 place-items-center rounded-xl border border-black/10 bg-white px-3 text-sm font-bold disabled:opacity-40"
  return (
    <section className={`${cardClass} space-y-2 p-4`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-base font-bold">{invoice.invoice_number}</span>
        <StatusBadgeFor status={invoice.status} />
      </div>
      <p className={`text-sm ${mutedClass}`}>
        {[invoice.source_label, invoice.customer?.name].filter(Boolean).join(" · ")}
      </p>
      <p className="text-sm">
        {invoice.issued_at ? `${formatBookingDate(invoice.issued_at, { month: "short", day: "numeric", year: "numeric" })} · ` : ""}
        <span className="font-bold">
          {formatMoney(Number(invoice.total))} {invoice.currency}
        </span>
        <span className={mutedClass}> · tax {formatMoney(Number(invoice.tax))}</span>
      </p>
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <select
          aria-label="Invoice status"
          disabled={save.isPending}
          value={invoice.status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-10 rounded-xl border border-black/10 bg-white px-3 text-sm font-semibold capitalize outline-none focus:border-[#C96C83]"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button type="button" onClick={onView} className={button}>
          View
        </button>
        {invoice.has_pdf ? (
          <button type="button" onClick={download} aria-label="Download PDF" className={button}>
            <Download className="size-4" aria-hidden />
          </button>
        ) : null}
        <button type="button" disabled={resend.isPending} aria-label="Re-email to customer" className={button}
          onClick={() =>
            resend.mutate(invoice.id, {
              onSuccess: () => toast({ title: "Invoice email sent", variant: "success" }),
              onError: (e) => toast({ title: "Invoice email not sent", description: apiError(e, "Could not resend this invoice."), variant: "error" }),
            })
          }
        >
          <Mail className="size-4" aria-hidden />
        </button>
        <button type="button" disabled={del.isPending} onClick={remove} className={`${button} text-[#8f3f4b]`}>
          Delete
        </button>
      </div>
    </section>
  )
}

// The full invoice (the same breakdown as the PDF) as a bottom sheet.
function InvoiceSheet({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-end bg-black/40" role="dialog" aria-modal="true" aria-label={`Invoice ${invoice.invoice_number}`} onClick={onClose}>
      <div
        className="max-h-[88dvh] w-full overflow-y-auto rounded-t-3xl bg-white px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-lg font-extrabold">{invoice.invoice_number}</p>
            <p className={`text-sm ${mutedClass}`}>
              {invoice.source_label} · {invoice.payment_method ?? "Payment pending"}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid size-10 shrink-0 place-items-center rounded-full bg-[#F4F2EF]">
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <InvoiceBreakdown invoice={invoice} />
      </div>
    </div>
  )
}
