"use client"

import { useState } from "react"
import { ChevronDown, Download, FileText } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Button } from "@/components/ui/button"
import { useInvoices, downloadInvoice, type Invoice } from "@/lib/hooks/use-invoices"

const cad = (v: string | number) => `$${Number(v).toFixed(2)}`
const STATUS_COLOR: Record<string, string> = { paid: "#5a9e5a", issued: "#d4a843", void: "#8a8d93", refunded: "#d4754a" }

const KIND_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "All" },
  { value: "booking", label: "Bookings" },
  { value: "order", label: "Products" },
  { value: "gift_card", label: "Gift cards" },
]

export default function CustomerTransactionsPage() {
  const [page, setPage] = useState(1)
  const [kind, setKind] = useState("")
  const { data, isLoading } = useInvoices(page, kind)
  const invoices = data?.data ?? []

  return (
    <div className="space-y-6">
      <DashboardHeader title="Transactions" subtitle="Your invoices and payment history" />

      <div className="flex gap-2 flex-wrap">
        {KIND_FILTERS.map((f) => (
          <button
            key={f.value || "all"}
            onClick={() => { setKind(f.value); setPage(1) }}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
            style={kind === f.value ? { background: "#c96c83", color: "#fff" } : { background: "white", color: "#5f6268", border: "1px solid #e5e5e5" }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-sm text-[#5f6268]">Loading…</div>
      ) : invoices.length === 0 ? (
        <div className="rounded-xl border border-black/8 bg-white px-5 py-12 text-center text-sm text-[#5f6268]">
          No transactions yet. Invoices appear here after a booking or purchase.
        </div>
      ) : (
        <div className="space-y-3">
          {invoices.map((inv) => <TransactionRow key={inv.id} invoice={inv} />)}
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

function TransactionRow({ invoice }: { invoice: Invoice }) {
  const [open, setOpen] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const color = STATUS_COLOR[invoice.status] ?? "#8a8d93"

  async function handleDownload() {
    setDownloading(true)
    try { await downloadInvoice(invoice.id, invoice.invoice_number) } finally { setDownloading(false) }
  }

  return (
    <div className="rounded-xl border border-black/8 bg-white">
      <div className="flex items-center gap-3 px-5 py-4">
        <FileText className="size-5 shrink-0 text-[#c96c83]" />
        <button onClick={() => setOpen((o) => !o)} className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-[#101217]">{invoice.invoice_number}</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium capitalize" style={{ background: `${color}22`, color }}>{invoice.status}</span>
            <span className="text-xs text-[#5f6268]">{invoice.source_label}</span>
          </div>
          <p className="text-xs text-[#5f6268] mt-0.5">
            {invoice.issued_at ? new Date(invoice.issued_at).toLocaleDateString("en-CA") : ""} · {cad(invoice.total)} {invoice.currency}
          </p>
        </button>
        {invoice.has_pdf && (
          <Button size="xs" variant="outline" disabled={downloading} onClick={handleDownload}>
            <Download className="size-3.5" /> {downloading ? "…" : "Invoice"}
          </Button>
        )}
        <button onClick={() => setOpen((o) => !o)} className="text-[#5f6268]">
          <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>

      {open && (
        <div className="border-t border-black/8 px-5 py-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[#5f6268]">
                <th className="pb-1 font-medium">Description</th>
                <th className="pb-1 font-medium text-right">Qty</th>
                <th className="pb-1 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.line_items.map((li, i) => (
                <tr key={i} className="border-t border-black/5">
                  <td className="py-1.5 text-[#101217]">{li.description}</td>
                  <td className="py-1.5 text-right text-[#5f6268]">{li.quantity}</td>
                  <td className="py-1.5 text-right text-[#101217]">{cad(li.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3 ml-auto w-48 space-y-1 text-sm">
            <Row label="Subtotal" value={cad(invoice.subtotal)} />
            <Row label={`HST (${Math.round(Number(invoice.tax_rate) * 100)}%)`} value={cad(invoice.tax)} />
            <Row label="Total" value={`${cad(invoice.total)} ${invoice.currency}`} bold />
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between" style={{ fontWeight: bold ? 700 : 400, color: bold ? "#c96c83" : "#5f6268" }}>
      <span>{label}</span><span>{value}</span>
    </div>
  )
}
