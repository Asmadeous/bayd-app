"use client"

import { useState } from "react"
import { Download, FileText, Mail, Plus, Trash2 } from "lucide-react"
import { z } from "zod"

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
  DialogFooter,
  DialogHeader,
  DialogTitle,
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

const cad = (v: string | number) => `$${Number(v).toFixed(2)}`
const STATUSES = ["issued", "paid", "void", "refunded"]
const KINDS = ["booking", "order", "gift_card", "manual"]
const PAYMENT_METHODS = ["card", "cash", "etransfer", "manual"]

const BLANK_MANUAL_INVOICE = {
  user_id: "",
  description: "",
  subtotal: "",
  tax: "",
  total: "",
  payment_method: "card",
  notes: "",
}

type ManualInvoiceFormState = typeof BLANK_MANUAL_INVOICE
type ManualInvoiceFormErrors = Partial<Record<keyof ManualInvoiceFormState | "base", string>>

const optionalMoney = (label: string) =>
  z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || Number.isFinite(Number(value)), `${label} must be a number.`)
    .refine((value) => !value || Number(value) >= 0, `${label} cannot be negative.`)

const manualInvoiceSchema = z.object({
  user_id: z
    .string()
    .trim()
    .min(1, "Customer user ID is required.")
    .refine((value) => Number.isInteger(Number(value)) && Number(value) > 0, "Enter a valid customer user ID."),
  description: z.string().trim().min(1, "Description is required."),
  subtotal: optionalMoney("Subtotal"),
  tax: optionalMoney("Tax"),
  total: z
    .string()
    .trim()
    .min(1, "Total is required.")
    .refine((value) => Number.isFinite(Number(value)), "Total must be a number.")
    .refine((value) => Number(value) > 0, "Total must be greater than 0."),
  payment_method: z.string().trim().min(1, "Payment method is required."),
  notes: z.string(),
}).refine((value) => !value.tax || Number(value.tax) <= Number(value.total), {
  message: "Tax cannot be greater than the total.",
  path: ["tax"],
})

const inputClass =
  "h-10 w-full border border-black/15 bg-white px-3 text-sm text-[#101217] outline-none transition focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20"
const errorInputClass =
  "border-[#b75c68] focus:border-[#b75c68] focus:ring-[#b75c68]/20"
const labelClass = "mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-[#6b6f76]"

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

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent data-tour="admin-invoices-form" className="max-w-3xl">
          <DialogHeader className="pr-14">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a36f4d]">
              Manual invoice
            </p>
            <DialogTitle>Create manual invoice</DialogTitle>
            <DialogDescription>
              Create an invoice for an existing customer and email the generated PDF.
            </DialogDescription>
          </DialogHeader>
          <ManualInvoiceForm
            saving={save.isPending}
            onCancel={() => setCreating(false)}
            onSave={async (d) => { await save.mutateAsync(d); setCreating(false) }}
          />
        </DialogContent>
      </Dialog>

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
              onStatus={(s) => save.mutate({ id: inv.id, status: s })}
              deleting={del.isPending}
              onDelete={() => del.mutate(inv.id)}
              onResend={() => resend.mutate(inv.id)}
            />
          ))}
        </div>
      )}

      <TutorialButton steps={adminInvoicesSteps} pageKey="admin-invoices" />
    </DashboardPage>
  )
}

function Row({ deleting, invoice, onStatus, onDelete, onResend }: {
  invoice: Invoice
  deleting: boolean
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

function ManualInvoiceForm({ saving, onSave, onCancel }: {
  saving: boolean
  onSave: (data: Record<string, unknown>) => Promise<void>
  onCancel: () => void
}) {
  const { toast } = useToast()
  const [f, setF] = useState(BLANK_MANUAL_INVOICE)
  const [errors, setErrors] = useState<ManualInvoiceFormErrors>({})

  function set<K extends keyof ManualInvoiceFormState>(key: K, value: ManualInvoiceFormState[K]) {
    setF((current) => ({ ...current, [key]: value }))
    setErrors((current) => {
      if (!current[key] && !current.base) return current
      const next = { ...current }
      delete next[key]
      delete next.base
      return next
    })
  }

  function setAmount(key: "subtotal" | "tax", value: string) {
    setF((current) => {
      const next = { ...current, [key]: value }
      const subtotal = Number(next.subtotal || 0)
      const tax = Number(next.tax || 0)
      const hasCalculatedAmount = next.subtotal !== "" || next.tax !== ""

      if (hasCalculatedAmount && Number.isFinite(subtotal) && Number.isFinite(tax)) {
        next.total = (subtotal + tax).toFixed(2)
      } else if (!hasCalculatedAmount) {
        next.total = ""
      }

      return next
    })
    setErrors((current) => {
      if (!current[key] && !current.total && !current.base) return current
      const next = { ...current }
      delete next[key]
      delete next.total
      delete next.base
      return next
    })
  }

  async function submit() {
    const result = manualInvoiceSchema.safeParse(f)
    if (!result.success) {
      const nextErrors = getFieldErrors(result.error)
      setErrors(nextErrors)
      toast({
        title: "Manual invoice needs attention",
        description: nextErrors.base ?? "Check the highlighted fields and try again.",
        variant: "error",
      })
      return
    }

    const total = Number(f.total)
    const tax = Number(f.tax || 0)
    const subtotal = Number(f.subtotal || Math.max(total - tax, 0))

    try {
      await onSave({
        user_id: Number(f.user_id),
        kind: "manual",
        status: "issued",
        payment_method: f.payment_method,
        subtotal,
        tax,
        total,
        notes: f.notes,
        line_items: [
          {
            description: f.description.trim(),
            quantity: 1,
            unit_price: subtotal,
            amount: subtotal,
          },
        ],
      })
    } catch (error) {
      const message = getApiErrorMessage(error, "Could not create this invoice.")
      setErrors({ base: message })
      toast({ title: "Invoice not created", description: message, variant: "error" })
    }
  }

  return (
    <>
      <DialogBody>
        {errors.base ? (
          <div
            aria-live="polite"
            className="mb-4 border border-[#b75c68]/25 bg-[#fff5f6] px-4 py-3 text-sm font-semibold text-[#8f3f4b]"
          >
            {errors.base}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field error={errors.user_id} label="Customer user ID">
            <input
              aria-invalid={Boolean(errors.user_id)}
              className={fieldClass(errors.user_id)}
              inputMode="numeric"
              onChange={(event) => set("user_id", event.target.value)}
              placeholder="Example: 42"
              value={f.user_id}
            />
          </Field>
          <Field error={errors.payment_method} label="Payment method">
            <Select onValueChange={(value) => set("payment_method", value)} value={f.payment_method}>
              <SelectTrigger aria-invalid={Boolean(errors.payment_method)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((method) => (
                  <SelectItem key={method} value={method}>
                    {method.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field className="sm:col-span-2" error={errors.description} label="Line item description">
            <input
              aria-invalid={Boolean(errors.description)}
              className={fieldClass(errors.description)}
              onChange={(event) => set("description", event.target.value)}
              placeholder="Example: Custom beauty package"
              value={f.description}
            />
          </Field>
          <Field error={errors.subtotal} label="Subtotal">
            <input
              aria-invalid={Boolean(errors.subtotal)}
              className={fieldClass(errors.subtotal)}
              inputMode="decimal"
              min="0"
              onChange={(event) => setAmount("subtotal", event.target.value)}
              placeholder="0.00"
              step="0.01"
              type="number"
              value={f.subtotal}
            />
          </Field>
          <Field error={errors.tax} label="Tax">
            <input
              aria-invalid={Boolean(errors.tax)}
              className={fieldClass(errors.tax)}
              inputMode="decimal"
              min="0"
              onChange={(event) => setAmount("tax", event.target.value)}
              placeholder="0.00"
              step="0.01"
              type="number"
              value={f.tax}
            />
          </Field>
          <Field error={errors.total} label="Total">
            <input
              aria-invalid={Boolean(errors.total)}
              className={fieldClass(errors.total)}
              inputMode="decimal"
              min="0"
              onChange={(event) => set("total", event.target.value)}
              placeholder="Auto-calculated"
              readOnly={f.subtotal !== "" || f.tax !== ""}
              step="0.01"
              type="number"
              value={f.total}
            />
          </Field>
          <Field className="sm:col-span-2" label="Internal notes">
            <textarea
              className="min-h-24 w-full resize-none border border-black/15 bg-white px-3 py-2 text-sm text-[#101217] outline-none transition focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20"
              onChange={(event) => set("notes", event.target.value)}
              placeholder="Optional context for the invoice"
              value={f.notes}
            />
          </Field>
        </div>
      </DialogBody>
      <DialogFooter>
        <Button size="sm" disabled={saving || !f.user_id || !f.total} onClick={submit} style={{ background: "#c96c83", border: "none", color: "#fff" }}>
          {saving ? "Saving..." : "Create & email"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </DialogFooter>
    </>
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

function Field({ children, className, error, label }: {
  children: React.ReactNode
  className?: string
  error?: string
  label: string
}) {
  return (
    <label className={className}>
      <span className={labelClass}>{label}</span>
      {children}
      {error ? <span className="mt-1 block text-xs font-semibold text-[#b75c68]">{error}</span> : null}
    </label>
  )
}

function fieldClass(error?: string) {
  return `${inputClass} ${error ? errorInputClass : ""}`
}

function getFieldErrors(error: z.ZodError<ManualInvoiceFormState>): ManualInvoiceFormErrors {
  const next: ManualInvoiceFormErrors = {}
  for (const issue of error.issues) {
    const key = issue.path.at(-1)
    if (typeof key === "string" && !next[key as keyof ManualInvoiceFormErrors]) {
      next[key as keyof ManualInvoiceFormErrors] = issue.message
    }
  }
  next.base = "Check the highlighted fields and try again."
  return next
}

function getApiErrorMessage(error: unknown, fallback: string) {
  const data = (error as { response?: { data?: { error?: string; errors?: string[] } } })?.response?.data
  return data?.error ?? data?.errors?.join(", ") ?? fallback
}
