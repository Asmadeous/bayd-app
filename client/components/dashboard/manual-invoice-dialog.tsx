"use client"

import { useState } from "react"
import { z } from "zod"

import { useToast } from "@/components/bayd-toast-provider"
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
import { useSaveInvoice } from "@/lib/hooks/use-admin"

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

// Creates a manual invoice for an existing customer and emails the PDF.
// Shared by the web Invoices page and the BAYD Admin app.
export function ManualInvoiceDialog({ onClose }: { onClose: () => void }) {
  const { toast } = useToast()
  const save = useSaveInvoice()
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
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
          onCancel={onClose}
          onSave={async (d) => {
            await save.mutateAsync(d)
            toast({ title: "Invoice created", variant: "success" })
            onClose()
          }}
        />
      </DialogContent>
    </Dialog>
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
            <Select onValueChange={(value) => set("payment_method", value ?? "")} value={f.payment_method}>
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

function getFieldErrors(error: z.ZodError): ManualInvoiceFormErrors {
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
