"use client"

import { useEffect, useState } from "react"
import { Gift, Plus, Send, Trash2 } from "lucide-react"
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
import { GiftCardVisual } from "@/components/gift-card-visual"
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
import { DatePicker } from "@/components/ui/date-picker"
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
  useAdminGiftCards,
  useSaveGiftCard,
  useDeleteGiftCard,
  useDeliverGiftCard,
  useTopupGiftCard,
} from "@/lib/hooks/use-admin"
import { adminGiftCardsSteps } from "@/lib/tours/admin-gift-cards-tour"
import type { GiftCard } from "@/lib/hooks/use-gift-cards"

const BLANK = {
  initial_balance: "", expires_at: "", recipient_email: "", recipient_name: "", sender_name: "", message: "",
}

type GiftCardFormState = typeof BLANK
type GiftCardFormErrors = Partial<Record<keyof GiftCardFormState | "base", string>>

const giftCardSchema = z.object({
  initial_balance: z
    .string()
    .trim()
    .min(1, "Amount is required.")
    .refine((value) => Number.isFinite(Number(value)), "Amount must be a number.")
    .refine((value) => Number(value) > 0, "Amount must be greater than 0."),
  expires_at: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || isTodayOrFuture(value), "Expiration date cannot be in the past."),
  recipient_email: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || z.email().safeParse(value).success, "Enter a valid recipient email."),
  recipient_name: z.string(),
  sender_name: z.string(),
  message: z.string(),
})

const inputClass =
  "h-10 w-full border border-black/15 bg-white px-3 text-sm text-[#101217] outline-none transition focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20"
const errorInputClass =
  "border-[#b75c68] focus:border-[#b75c68] focus:ring-[#b75c68]/20"
const labelClass = "mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-[#6b6f76]"

export default function AdminGiftCardsPage() {
  const { toast } = useToast()
  const [page, setPage] = useState(1)
  const [active, setActive] = useState("")
  const [creating, setCreating] = useState(false)
  const { data, isError, isLoading } = useAdminGiftCards({ active: active || undefined, page })
  const save = useSaveGiftCard()
  const del = useDeleteGiftCard()
  const deliver = useDeliverGiftCard()
  const cards = data?.data ?? []

  useEffect(() => {
    if (isError) {
      toast({
        title: "Gift cards not loaded",
        description: "Could not load gift cards.",
        variant: "error",
      })
    }
  }, [isError, toast])

  return (
    <DashboardPage maxWidth="wide">
      <div data-tour="admin-giftcards-header">
        <DashboardHeader
          title="Gift Cards"
          subtitle="Issue, manage, and send gift cards."
          actions={
            <Button size="sm" onClick={() => setCreating(true)} style={{ background: "#c96c83", border: "none", color: "#fff" }}>
              <Plus className="size-4" /> Issue card
            </Button>
          }
        />
      </div>

      <DashboardToolbar data-tour="admin-giftcards-filters">
        <ToolbarSection>
          <SegmentedControl>
        {[["", "All"], ["true", "Active"], ["false", "Disabled"]].map(([v, l]) => (
          <SegmentButton active={active === v} key={l} onClick={() => setActive(v)}>
            {l}
          </SegmentButton>
        ))}
          </SegmentedControl>
        </ToolbarSection>
      </DashboardToolbar>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent data-tour="admin-giftcards-form" className="max-w-3xl">
          <DialogHeader className="pr-14">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a36f4d]">
              Gift cards
            </p>
            <DialogTitle>Issue gift card</DialogTitle>
            <DialogDescription>
              Create a BAYD gift card with an auto-generated code. Add a recipient email if it should be sent automatically.
            </DialogDescription>
          </DialogHeader>
          <CreateForm
            saving={save.isPending}
            onCancel={() => setCreating(false)}
            onSave={async (d) => {
              await save.mutateAsync(d)
              toast({ title: "Gift card issued", variant: "success" })
              setCreating(false)
            }}
          />
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <DashboardPanel>
          <p className="text-sm text-[#5f6268]">Loading gift cards...</p>
        </DashboardPanel>
      ) : cards.length === 0 ? (
        <EmptyState
          icon={Gift}
          title="No gift cards yet"
          description="Issued gift cards will appear here."
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" data-tour="admin-giftcards-grid">
          {cards.map((c) => (
            <AdminCard key={c.id} card={c}
              onToggle={() => save.mutate(
                { id: c.id, active: !c.active },
                {
                  onSuccess: () => toast({ title: c.active ? "Gift card disabled" : "Gift card enabled", variant: "success" }),
                  onError: (error) => toast({
                    title: "Gift card not updated",
                    description: getApiErrorMessage(error, "Could not update this gift card."),
                    variant: "error",
                  }),
                },
              )}
              toggling={save.isPending}
              deleting={del.isPending}
              onDelete={() => del.mutate(c.id, {
                onSuccess: () => toast({ title: "Gift card deleted", variant: "success" }),
                onError: (error) => toast({
                  title: "Gift card not deleted",
                  description: getApiErrorMessage(error, "Could not delete this gift card."),
                  variant: "error",
                }),
              })}
              onSend={() => deliver.mutate(c.id, {
                onSuccess: () => toast({ title: "Gift card sent", variant: "success" }),
                onError: (error) => toast({
                  title: "Gift card not sent",
                  description: getApiErrorMessage(error, "Could not send this gift card."),
                  variant: "error",
                }),
              })}
              sending={deliver.isPending}
            />
          ))}
        </div>
      )}

      {data?.pagination && data.pagination.total_pages > 1 && (
        <DashboardToolbar className="justify-end">
          <ToolbarSection className="ml-auto">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
          <span className="px-2 text-sm font-semibold text-[#5f6268]">{page} / {data.pagination.total_pages}</span>
          <Button variant="outline" size="sm" disabled={!data.pagination.next_page} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </ToolbarSection>
        </DashboardToolbar>
      )}

      <TutorialButton steps={adminGiftCardsSteps} pageKey="admin-gift-cards" />
    </DashboardPage>
  )
}

function AdminCard({ card, deleting, onToggle, onDelete, onSend, sending, toggling }: {
  card: GiftCard
  deleting: boolean
  onToggle: () => void
  onDelete: () => void
  onSend: () => void
  sending: boolean
  toggling: boolean
}) {
  const { toast } = useToast()
  const to = card.recipient_email || card.purchaser?.email
  const topup = useTopupGiftCard()
  const [amount, setAmount] = useState("")
  const [method, setMethod] = useState("pos")

  function markPaid() {
    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0) {
      toast({
        title: "Top-up needs attention",
        description: "Enter a top-up amount greater than 0.",
        variant: "error",
      })
      return
    }

    topup.mutate(
      { id: card.id, amount: value, method },
      {
        onSuccess: () => {
          setAmount("")
          toast({ title: "Gift card top-up recorded", variant: "success" })
        },
        onError: (error) => toast({
          title: "Top-up not recorded",
          description: getApiErrorMessage(error, "Could not record this gift card top-up."),
          variant: "error",
        }),
      },
    )
  }

  return (
    <DashboardPanel className="space-y-3 p-4">
      <GiftCardVisual code={card.code} balance={card.current_balance} expiresAt={card.expires_at} recipientName={card.recipient_name} active={card.active} />
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-[#5f6268] truncate">{to ? `→ ${to}` : "No recipient"}{card.delivered_at ? " · sent" : ""}</span>
        <div className="flex gap-1.5 shrink-0">
          <Button size="xs" variant="outline" disabled={!to || sending} onClick={onSend} title={to ? "Send to recipient" : "Add a recipient email first"}>
            <Send className="size-3.5" />
          </Button>
          <Button size="xs" variant="outline" disabled={toggling} onClick={onToggle}>{card.active ? "Disable" : "Enable"}</Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={deleting} size="xs" variant="outline">
                <Trash2 className="size-3.5 text-[#d4754a]" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete gift card?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete gift card {card.code}. Customers will no longer be able
                  to redeem it, and this cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete}>Delete gift card</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 border-t border-black/8 px-1 pt-3">
        <input
          type="number" min="0" step="1" inputMode="decimal" placeholder="Top-up $"
          value={amount} onChange={(e) => setAmount(e.target.value)}
          className="h-9 w-28 border border-black/15 px-2 text-sm focus:border-[#c96c83] focus:outline-none"
        />
        <Select value={method} onValueChange={(value) => setMethod(value ?? "pos")}>
          <SelectTrigger className="h-9 w-28 px-2 text-xs">
            <SelectValue placeholder="Method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pos">POS</SelectItem>
            <SelectItem value="card">Card</SelectItem>
            <SelectItem value="cash">Cash</SelectItem>
          </SelectContent>
        </Select>
        <Button size="xs" variant="outline" disabled={topup.isPending || !amount} onClick={markPaid}>
          {topup.isPending ? "…" : "Mark paid"}
        </Button>
      </div>
    </DashboardPanel>
  )
}

function CreateForm({ saving, onSave, onCancel }: {
  saving: boolean
  onSave: (data: Record<string, unknown>) => Promise<void>
  onCancel: () => void
}) {
  const { toast } = useToast()
  const [f, setF] = useState(BLANK)
  const [errors, setErrors] = useState<GiftCardFormErrors>({})
  const today = new Date()
  const minExpirationDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`

  function set<K extends keyof GiftCardFormState>(key: K, value: GiftCardFormState[K]) {
    setF((current) => ({ ...current, [key]: value }))
    setErrors((current) => {
      if (!current[key] && !current.base) return current
      const next = { ...current }
      delete next[key]
      delete next.base
      return next
    })
  }

  async function submit() {
    const result = giftCardSchema.safeParse(f)
    if (!result.success) {
      const nextErrors = getFieldErrors(result.error)
      setErrors(nextErrors)
      toast({
        title: "Gift card needs attention",
        description: nextErrors.base ?? "Check the highlighted fields and try again.",
        variant: "error",
      })
      return
    }

    try {
      await onSave({
        initial_balance: Number(f.initial_balance),
        expires_at: f.expires_at || undefined,
        recipient_email: f.recipient_email.trim() || undefined,
        recipient_name: f.recipient_name.trim() || undefined,
        sender_name: f.sender_name.trim() || undefined,
        message: f.message.trim() || undefined,
      })
    } catch (error) {
      const message = getApiErrorMessage(error, "Could not issue this gift card.")
      setErrors({ base: message })
      toast({ title: "Gift card not issued", description: message, variant: "error" })
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
          <Field error={errors.initial_balance} label="Gift card amount">
            <input
              aria-invalid={Boolean(errors.initial_balance)}
              className={fieldClass(errors.initial_balance)}
              inputMode="decimal"
              min="0"
              onChange={(event) => set("initial_balance", event.target.value)}
              placeholder="Example: 100.00"
              step="0.01"
              type="number"
              value={f.initial_balance}
            />
          </Field>
          <Field error={errors.expires_at} label="Expiration date">
            <DatePicker
              className={errors.expires_at ? errorInputClass : ""}
              min={minExpirationDate}
              placeholder="Optional expiration date"
              value={f.expires_at}
              onChange={(value) => set("expires_at", value)}
            />
          </Field>
          <Field error={errors.recipient_email} label="Recipient email">
            <input
              aria-invalid={Boolean(errors.recipient_email)}
              className={fieldClass(errors.recipient_email)}
              onChange={(event) => set("recipient_email", event.target.value)}
              placeholder="customer@example.com"
              type="email"
              value={f.recipient_email}
            />
          </Field>
          <Field error={errors.recipient_name} label="Recipient name">
            <input
              aria-invalid={Boolean(errors.recipient_name)}
              className={fieldClass(errors.recipient_name)}
              onChange={(event) => set("recipient_name", event.target.value)}
              placeholder="Customer name"
              value={f.recipient_name}
            />
          </Field>
          <Field error={errors.sender_name} label="Sender name">
            <input
              aria-invalid={Boolean(errors.sender_name)}
              className={fieldClass(errors.sender_name)}
              onChange={(event) => set("sender_name", event.target.value)}
              placeholder="Who the gift is from"
              value={f.sender_name}
            />
          </Field>
          <Field className="sm:col-span-2" error={errors.message} label="Gift message">
            <textarea
              aria-invalid={Boolean(errors.message)}
              className={`min-h-24 w-full resize-none border border-black/15 bg-white px-3 py-2 text-sm text-[#101217] outline-none transition focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20 ${errors.message ? errorInputClass : ""}`}
              onChange={(event) => set("message", event.target.value)}
              placeholder="Optional message for the recipient"
              value={f.message}
            />
          </Field>
        </div>
        <p className="mt-4 text-xs text-[#8a8d93]">
          Code is auto-generated as BAYD-…. Adding a recipient email sends the card automatically.
        </p>
      </DialogBody>
      <DialogFooter>
        <Button size="sm" disabled={saving || !f.initial_balance} onClick={submit} style={{ background: "#c96c83", border: "none", color: "#fff" }}>
          {saving ? "Issuing…" : "Issue card"}
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

function getFieldErrors(error: z.ZodError<GiftCardFormState>): GiftCardFormErrors {
  const next: GiftCardFormErrors = {}
  for (const issue of error.issues) {
    const key = issue.path.at(-1)
    if (typeof key === "string" && !next[key as keyof GiftCardFormErrors]) {
      next[key as keyof GiftCardFormErrors] = issue.message
    }
  }
  next.base = "Check the highlighted fields and try again."
  return next
}

function getApiErrorMessage(error: unknown, fallback: string) {
  const data = (error as { response?: { data?: { error?: string; errors?: string[] } } })?.response?.data
  return data?.error ?? data?.errors?.join(", ") ?? fallback
}

function isTodayOrFuture(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  if (!year || !month || !day) return false
  const date = new Date(year, month - 1, day)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return date >= today
}
