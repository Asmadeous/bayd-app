"use client"

import { useEffect, useState } from "react"
import { Download, FileText, ReceiptText, X } from "lucide-react"

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
import { Button } from "@/components/ui/button"
import { downloadInvoice, useInvoices, type Invoice } from "@/lib/hooks/use-invoices"
import { InvoiceBreakdown } from "@/components/invoice/invoice-breakdown"
import { customerTransactionsSteps } from "@/lib/tours/customer-transactions-tour"

const cad = (value: string | number) => {
  const amount = Number(value)
  return Number.isFinite(amount) ? `$${amount.toFixed(2)}` : "-"
}

const KIND_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "All" },
  { value: "booking", label: "Bookings" },
  { value: "order", label: "Products" },
  { value: "gift_card", label: "Gift cards" },
]

export default function CustomerTransactionsPage() {
  const { toast } = useToast()
  const [page, setPage] = useState(1)
  const [kind, setKind] = useState("")
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const { data, isError, isLoading } = useInvoices(page, kind)
  const invoices = data?.data ?? []

  useEffect(() => {
    if (isError) {
      toast({
        title: "Transactions could not be loaded",
        description: "Refresh the page or try again shortly.",
        variant: "error",
      })
    }
  }, [isError, toast])

  function selectKind(value: string) {
    setKind(value)
    setPage(1)
  }

  return (
    <DashboardPage maxWidth="wide">
      <div data-tour="customer-transactions-header">
        <DashboardHeader
          title="Transactions"
          subtitle="Review receipts, invoices, and payment history for your account."
        />
      </div>

      <DashboardToolbar data-tour="customer-transactions-filters">
        <ToolbarSection>
          <SegmentedControl>
            {KIND_FILTERS.map((filter) => (
              <SegmentButton
                active={kind === filter.value}
                key={filter.value || "all"}
                onClick={() => selectKind(filter.value)}
              >
                {filter.label}
              </SegmentButton>
            ))}
          </SegmentedControl>
        </ToolbarSection>
        <ToolbarSection className="text-sm font-semibold text-[#5f6268]">
          Page {page}
        </ToolbarSection>
      </DashboardToolbar>

      {isLoading ? (
        <DashboardPanel>
          <p className="text-sm text-[#5f6268]">Loading transactions...</p>
        </DashboardPanel>
      ) : invoices.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title="No transactions yet"
          description="Receipts and invoices appear here after a booking or purchase."
        />
      ) : (
        <div className="space-y-3" data-tour="customer-transactions-list">
          {invoices.map((invoice) => (
            <TransactionCard
              invoice={invoice}
              key={invoice.id}
              onViewReceipt={() => setSelectedInvoice(invoice)}
            />
          ))}
        </div>
      )}

      {data?.pagination && data.pagination.total_pages > 1 ? (
        <DashboardToolbar className="justify-end">
          <ToolbarSection className="ml-auto">
            <Button
              disabled={page <= 1}
              onClick={() => setPage((currentPage) => currentPage - 1)}
              size="sm"
              variant="outline"
            >
              Prev
            </Button>
            <span className="px-2 text-sm font-semibold text-[#5f6268]">
              {page} / {data.pagination.total_pages}
            </span>
            <Button
              disabled={!data.pagination.next_page}
              onClick={() => setPage((currentPage) => currentPage + 1)}
              size="sm"
              variant="outline"
            >
              Next
            </Button>
          </ToolbarSection>
        </DashboardToolbar>
      ) : null}

      {selectedInvoice ? (
        <ReceiptDialog invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} />
      ) : null}

      <TutorialButton steps={customerTransactionsSteps} pageKey="customer-transactions" />
    </DashboardPage>
  )
}

function TransactionCard({
  invoice,
  onViewReceipt,
}: {
  invoice: Invoice
  onViewReceipt: () => void
}) {
  const { toast } = useToast()
  const [downloading, setDownloading] = useState(false)

  async function handleDownload() {
    setDownloading(true)
    try {
      await downloadInvoice(invoice.id, invoice.invoice_number)
      toast({ title: "Invoice download started", variant: "success" })
    } catch (error) {
      toast({
        title: "Invoice could not be downloaded",
        description: getApiErrorMessage(error, "Please try again."),
        variant: "error",
      })
    } finally {
      setDownloading(false)
    }
  }

  return (
    <DashboardPanel className="p-0">
      <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
        <button
          className="flex min-w-0 flex-1 items-start gap-3 text-left"
          onClick={onViewReceipt}
          type="button"
        >
          <span className="grid size-11 shrink-0 place-items-center border border-black/10 bg-[#f4f1eb] text-[#c96c83]">
            <FileText aria-hidden="true" className="size-5" />
          </span>
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-extrabold text-[#101217]">
                {invoice.invoice_number}
              </span>
              <StatusBadgeFor status={invoice.status} />
              <span className="text-xs font-semibold text-[#5f6268]">{invoice.source_label}</span>
            </span>
            <span className="mt-1 block text-xs font-semibold text-[#5f6268]">
              {formatDate(invoice.issued_at)} / {invoice.currency}
            </span>
          </span>
        </button>

        <div className="flex shrink-0 flex-wrap items-center gap-3 lg:justify-end">
          <span className="font-heading text-2xl font-extrabold text-[#101217]">
            {cad(invoice.total)}
          </span>
          <Button onClick={onViewReceipt} size="sm" variant="outline">
            View receipt
          </Button>
          {invoice.has_pdf ? (
            <Button disabled={downloading} onClick={handleDownload} size="sm" variant="outline">
              <Download aria-hidden="true" className="size-4" />
              {downloading ? "Downloading..." : "PDF"}
            </Button>
          ) : null}
        </div>
      </div>
    </DashboardPanel>
  )
}

function ReceiptDialog({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const { toast } = useToast()
  const [downloading, setDownloading] = useState(false)

  async function handleDownload() {
    setDownloading(true)
    try {
      await downloadInvoice(invoice.id, invoice.invoice_number)
      toast({ title: "Invoice download started", variant: "success" })
    } catch (error) {
      toast({
        title: "Invoice could not be downloaded",
        description: getApiErrorMessage(error, "Please try again."),
        variant: "error",
      })
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[80] grid place-items-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto bg-[#f4f1eb] p-4 shadow-2xl shadow-black/25 sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="bg-white p-6 shadow-sm shadow-black/[0.03] sm:p-8">
          <div className="flex items-start justify-between gap-4 border-b border-black/10 pb-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#a36f4d]">
                Receipt
              </p>
              <h2 className="mt-2 text-2xl font-extrabold text-[#101217]">
                {invoice.invoice_number}
              </h2>
              <p className="mt-2 text-sm font-semibold text-[#5f6268]">
                {invoice.source_label} / {formatDate(invoice.issued_at)}
              </p>
            </div>
            <button
              aria-label="Close receipt"
              className="grid size-9 shrink-0 place-items-center border border-black/10 text-[#5f6268] transition-colors hover:bg-[#f4f1eb] hover:text-[#101217]"
              onClick={onClose}
              type="button"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>

          <div className="grid gap-4 border-b border-black/10 py-5 sm:grid-cols-3">
            <ReceiptMeta label="Status">
              <StatusBadgeFor status={invoice.status} />
            </ReceiptMeta>
            <ReceiptMeta label="Payment">
              {invoice.payment_method ? formatLabel(invoice.payment_method) : "Not listed"}
            </ReceiptMeta>
            <ReceiptMeta label="Paid">
              {invoice.paid_at ? formatDate(invoice.paid_at) : "Pending"}
            </ReceiptMeta>
          </div>

          <div className="py-5">
            <InvoiceBreakdown invoice={invoice} />
          </div>

          {invoice.notes ? (
            <div className="mt-5 border border-black/10 bg-[#fbfaf7] p-4 text-sm leading-6 text-[#5f6268]">
              {invoice.notes}
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <Button onClick={onClose} size="sm" variant="outline">
              Close
            </Button>
            {invoice.has_pdf ? (
              <Button disabled={downloading} onClick={handleDownload} size="sm" variant="outline">
                <Download aria-hidden="true" className="size-4" />
                {downloading ? "Downloading..." : "Download PDF"}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

function ReceiptMeta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#6b6f76]">{label}</p>
      <div className="mt-2 text-sm font-semibold text-[#101217]">{children}</div>
    </div>
  )
}

function formatDate(value: string | null) {
  if (!value) return "Not dated"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Not dated"

  return date.toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatLabel(value: string) {
  return value.replaceAll("_", " ")
}

function getApiErrorMessage(error: unknown, fallback: string) {
  const data = (error as { response?: { data?: { error?: string; errors?: string[] } } })?.response?.data
  return data?.error ?? data?.errors?.join(", ") ?? fallback
}
