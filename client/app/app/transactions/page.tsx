"use client"

import { useState } from "react"
import { X } from "lucide-react"

import { InvoiceBreakdown } from "@/components/invoice/invoice-breakdown"
import { useInvoices, type Invoice } from "@/lib/hooks/use-invoices"
import { cardClass, mutedClass } from "../app-theme"
import { SectionScreen } from "../section-screen"

const STATUS_STYLE: Record<string, string> = {
  paid: "bg-[#c96c83]/12 text-[#c96c83]",
  issued: "bg-black/8 text-[#101217]/60",
  void: "bg-[#8f3f4b]/12 text-[#8f3f4b]",
  refunded: "bg-[#8f3f4b]/12 text-[#8f3f4b]",
}

export default function AppTransactionsScreen() {
  const { data, isLoading } = useInvoices(1)
  const invoices = data?.data ?? []
  const [open, setOpen] = useState<Invoice | null>(null)

  return (
    <SectionScreen title="Transactions">
      {isLoading ? (
        <ListSkeleton />
      ) : invoices.length === 0 ? (
        <Empty text="No transactions yet." />
      ) : (
        <ul className="space-y-3 pb-6">
          {invoices.map((inv) => {
            const when = new Date(inv.issued_at ?? inv.created_at)
            return (
              <li key={inv.id}>
                <button type="button" onClick={() => setOpen(inv)} className={`block w-full p-4 text-left ${cardClass}`}>
                <div className="flex items-center justify-between">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.1em] ${
                      STATUS_STYLE[inv.status] ?? "bg-black/8 text-[#101217]/60"
                    }`}
                  >
                    {inv.status}
                  </span>
                  <span className="text-sm font-extrabold">${Number(inv.total).toFixed(2)}</span>
                </div>
                <p className="mt-2 text-sm font-bold">{inv.source_label}</p>
                <p className={`mt-0.5 text-xs ${mutedClass}`}>
                  {inv.invoice_number} · {when.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </p>
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {open ? <InvoiceSheet invoice={open} onClose={() => setOpen(null)} /> : null}
    </SectionScreen>
  )
}

// Full invoice (the same breakdown as the PDF) as a bottom sheet.
function InvoiceSheet({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-end bg-black/40" role="dialog" aria-modal="true" aria-label={`Invoice ${invoice.invoice_number}`} onClick={onClose}>
      <div
        className="max-h-[88vh] w-full overflow-y-auto rounded-t-3xl bg-white px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-[#C96C83]">Invoice</p>
            <p className="text-lg font-extrabold">{invoice.invoice_number}</p>
            <p className={`text-xs ${mutedClass}`}>
              {invoice.source_label} · {invoice.payment_method ?? "Payment pending"}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid size-9 place-items-center rounded-full bg-black/5">
            <X className="size-4" aria-hidden />
          </button>
        </div>
        <InvoiceBreakdown invoice={invoice} />
      </div>
    </div>
  )
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-20 animate-pulse rounded-3xl bg-black/[0.04]" />
      ))}
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <p className={`rounded-3xl bg-white p-8 text-center text-sm shadow-sm ${mutedClass}`}>{text}</p>
}
