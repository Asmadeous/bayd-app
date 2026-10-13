"use client"

import { useEffect, useState } from "react"
import { Download, FileText, Mail, Plus, Trash2 } from "lucide-react"

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
import { ManualInvoiceDialog } from "@/components/dashboard/manual-invoice-dialog"
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
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
import { adminInvoicesSteps } from "@/lib/tours/admin-invoices-tour"
import { downloadInvoice, type Invoice } from "@/lib/hooks/use-invoices"
import { InvoiceBreakdown } from "@/components/invoice/invoice-breakdown"
import { formatMoney } from "@/lib/stores/franchise-store"

const cad = (v: string | number) => `${formatMoney(Number(v))}`
const STATUSES = ["issued", "paid", "void", "refunded"]
const KINDS = ["booking", "order", "gift_card", "manual"]

export default function AdminInvoicesPage() {
  const { toast } = useToast()
  const [status, setStatus] = useState("")
  const [kind, setKind] = useState("")
  const [creating, setCreating] = useState(false)
  const { data, isError, isLoading } = useAdminInvoices({ status: status || undefined, kind: kind || undefined })
  const save = useSaveInvoice()
  const del = useDeleteInvoice()
  const resend = useResendInvoice()
  const invoices = data?.data ?? []

  useEffect(() => {
    if (isError) {
      toast({
        title: "Invoices not loaded",
        description: "Could not load invoices.",
        variant: "error",
      })
    }
  }, [isError, toast])

  return (
    <DashboardPage maxWidth="wide">
      <div data-tour="admin-invoices-header">
        <DashboardHeader
          title="Invoices"
          subtitle="All transactions across bookings, products, and gift cards."
          actions={
            <Button size="sm" onClick={() => setCreating(true)} style={{ background: "#c96c83", border: "none", color: "#fff" }}>
              <Plus className="size-4" /> Manual invoice
            </Button>
          }
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-2" data-tour="admin-invoices-filters">
        <Filter label="Status" value={status} set={setStatus} options={STATUSES} />
        <Filter label="Type" value={kind} set={setKind} options={KINDS} />
      </div>

      {creating ? <ManualInvoiceDialog onClose={() => setCreating(false)} /> : null}

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
        <div className="space-y-3" data-tour="admin-invoices-list">
          {invoices.map((inv) => (
            <Row key={inv.id} invoice={inv}
              saving={save.isPending}
              onStatus={(s) => save.mutate(
                { id: inv.id, status: s },
                {
                  onSuccess: () => toast({ title: "Invoice status saved", variant: "success" }),
                  onError: (error) => toast({
                    title: "Invoice status not saved",
                    description: getApiErrorMessage(error, "Could not update this invoice."),
                    variant: "error",
                  }),
                },
              )}
              deleting={del.isPending}
              onDelete={() => del.mutate(inv.id, {
                onSuccess: () => toast({ title: "Invoice deleted", variant: "success" }),
                onError: (error) => toast({
                  title: "Invoice not deleted",
                  description: getApiErrorMessage(error, "Could not delete this invoice."),
                  variant: "error",
                }),
              })}
              onResend={() => resend.mutate(inv.id, {
                onSuccess: () => toast({ title: "Invoice email sent", variant: "success" }),
                onError: (error) => toast({
                  title: "Invoice email not sent",
                  description: getApiErrorMessage(error, "Could not resend this invoice."),
                  variant: "error",
                }),
              })}
              resending={resend.isPending}
            />
          ))}
        </div>
      )}

      <TutorialButton steps={adminInvoicesSteps} pageKey="admin-invoices" />
    </DashboardPage>
  )
}

function Row({ deleting, invoice, onStatus, onDelete, onResend, resending, saving }: {
  invoice: Invoice
  deleting: boolean
  onStatus: (s: string) => void
  onDelete: () => void
  onResend: () => void
  resending: boolean
  saving: boolean
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
        <Select disabled={saving} onValueChange={(value) => onStatus(value ?? invoice.status)} value={invoice.status}>
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
        <Dialog>
          <DialogTrigger asChild>
            <Button size="xs" variant="outline" title="View invoice">
              <FileText className="size-3.5" /> View
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader className="pr-14">
              <DialogTitle>{invoice.invoice_number}</DialogTitle>
              <DialogDescription>
                {invoice.source_label} · {invoice.payment_method ?? "Payment pending"}
              </DialogDescription>
            </DialogHeader>
            <DialogBody>
              <InvoiceBreakdown invoice={invoice} />
            </DialogBody>
          </DialogContent>
        </Dialog>
        {invoice.has_pdf && (
          <Button size="xs" variant="outline" onClick={() => downloadInvoice(invoice.id, invoice.invoice_number, "admin")}>
            <Download className="size-3.5" />
          </Button>
        )}
        <Button disabled={resending} size="xs" variant="outline" onClick={onResend} title="Re-email to customer"><Mail className="size-3.5" /></Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button disabled={deleting} size="xs" variant="outline">
              <Trash2 className="size-3.5 text-[#d4754a]" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete invoice?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove invoice {invoice.invoice_number}. The customer will no longer see this
                invoice in their transactions.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete}>Delete invoice</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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

function getApiErrorMessage(error: unknown, fallback: string) {
  const data = (error as { response?: { data?: { error?: string; errors?: string[] } } })?.response?.data
  return data?.error ?? data?.errors?.join(", ") ?? fallback
}
