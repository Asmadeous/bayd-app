"use client"

import { useState } from "react"
import type { ReactNode } from "react"
import { Handshake, Plus, Trash2 } from "lucide-react"
import { z } from "zod"

import { useToast } from "@/components/bayd-toast-provider"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardPage } from "@/components/dashboard/dashboard-page"
import { DashboardPanel } from "@/components/dashboard/dashboard-panel"
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
  useAdminPartners,
  usePartnerDetail,
  useCreatePartner,
  useUpdatePartner,
  useDeletePartner,
  useSettlePartner,
  useMarkPayoutPaid,
  type Partner,
  type PartnerInput,
} from "@/lib/hooks/use-partners"
import { adminPartnersSteps } from "@/lib/tours/admin-partners-tour"

const cad = (v: string | number) => `$${Number(v).toFixed(2)}`
const dt = (s: string | null) => (s ? new Date(s).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" }) : "—")
const BLANK: PartnerInput = { name: "", email: "", phone: "", platform_fee_pct: "20", status: "active", payout_notes: "", password: "" }
type PartnerFormErrors = Partial<Record<keyof PartnerInput | "base", string>>

const partnerSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  // Email is the partner-provider's login, so it's required on create (validated
  // as such in save() where editingId is known); still shape-validated here.
  email: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || z.email().safeParse(value).success, "Enter a valid email address."),
  phone: z.string().trim().optional(),
  platform_fee_pct: z
    .string()
    .trim()
    .min(1, "Platform fee is required.")
    .refine((value) => Number.isFinite(Number(value)), "Platform fee must be a number.")
    .refine((value) => Number(value) >= 0 && Number(value) <= 100, "Platform fee must be between 0 and 100."),
  status: z.enum(["active", "inactive"]),
  payout_notes: z.string().trim().optional(),
  password: z.string().trim().optional(),
})

export default function AdminPartnersPage() {
  const { toast } = useToast()
  const { data, isLoading } = useAdminPartners()
  const create = useCreatePartner()
  const update = useUpdatePartner()
  const del = useDeletePartner()

  const [form, setForm] = useState<PartnerInput | null>(null)
  const [formErrors, setFormErrors] = useState<PartnerFormErrors>({})
  const [editingId, setEditingId] = useState<number | null>(null)
  const [openId, setOpenId] = useState<number | null>(null)

  const partners = data?.data ?? []

  function startCreate() {
    setForm(BLANK)
    setFormErrors({})
    setEditingId(null)
  }

  function startEdit(p: Partner) {
    setForm({ name: p.name, email: p.email ?? "", phone: p.phone ?? "", platform_fee_pct: p.platform_fee_pct, status: p.status, payout_notes: p.payout_notes ?? "" })
    setFormErrors({})
    setEditingId(p.id)
  }

  function closeEditor() {
    setForm(null)
    setFormErrors({})
    setEditingId(null)
  }

  function updateForm<K extends keyof PartnerInput>(key: K, value: PartnerInput[K]) {
    setForm((current) => ({ ...current!, [key]: value }))
    setFormErrors((current) => {
      if (!current[key] && !current.base) return current
      const next = { ...current }
      delete next[key]
      delete next.base
      return next
    })
  }

  function save() {
    if (!form) return
    const result = partnerSchema.safeParse(form)
    if (!result.success) {
      const nextErrors = getPartnerFieldErrors(result.error)
      setFormErrors(nextErrors)
      toast({ title: "Partner form needs attention", description: nextErrors.base, variant: "error" })
      return
    }

    // On create, email is the partner-provider's login, so it's required.
    if (!editingId && !form.email?.trim()) {
      setFormErrors({ email: "Email is required — it's the partner's login." })
      toast({ title: "Partner form needs attention", description: "Email is required.", variant: "error" })
      return
    }

    const payload = normalizePartnerInput(form)
    const opts = {
      onSuccess: () => {
        toast({ title: editingId ? "Partner saved" : "Partner created", variant: "success" })
        closeEditor()
      },
      onError: (error: unknown) => {
        const message = getApiErrorMessage(error, editingId ? "Could not update this partner." : "Could not create this partner.")
        setFormErrors({ base: message })
        toast({ title: editingId ? "Partner not saved" : "Partner not created", description: message, variant: "error" })
      },
    }
    if (editingId) update.mutate({ id: editingId, ...payload }, opts)
    else create.mutate(payload, opts)
  }

  function deletePartner(partner: Partner) {
    del.mutate(partner.id, {
      onSuccess: () => {
        toast({ title: "Partner deleted", description: `${partner.name} was removed.`, variant: "success" })
      },
      onError: (error: unknown) => {
        toast({
          title: "Partner not deleted",
          description: getApiErrorMessage(error, "Could not delete this partner."),
          variant: "error",
        })
      },
    })
  }

  return (
    <DashboardPage maxWidth="wide">
      <div data-tour="admin-partners-header">
        <DashboardHeader
          title="Partners"
          subtitle="Partner businesses supplying providers to the B.A.Y.D pool."
          actions={
            <Button size="sm" onClick={startCreate} style={{ background: "#c96c83", border: "none", color: "#fff" }}>
              <Plus aria-hidden="true" />
              Add Partner
            </Button>
          }
        />
      </div>

      <DashboardPanel data-tour="admin-partners-info">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a36f4d]">Payout model</p>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-[#5f6268]">
          Partners supply technicians and coverage; B.A.Y.D collects payment and holds funds.
          Each partner earns their share of completed bookings after the platform fee. Settle owed
          amounts into a payout, then mark it paid once funds are sent.
        </p>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-[#5f6268]">
          Creating a partner also creates a provider login (they sign in with the email and
          password below) and a bookable provider profile. That provider is <strong>dormant</strong>
          {" "}until you set its coverage areas and services on the{" "}
          <strong>Employees</strong> page — it won&apos;t take bookings until then.
        </p>
      </DashboardPanel>

      <Dialog open={form !== null} onOpenChange={(open) => { if (!open) closeEditor() }}>
        <DialogContent data-tour="admin-partners-form" className="max-w-4xl">
          <DialogHeader className="pr-14">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a36f4d]">
              Partner editor
            </p>
            <DialogTitle>{editingId ? "Edit Partner" : "New Partner"}</DialogTitle>
            <DialogDescription>
              Creating a partner also creates a provider login (they sign in with the email and
              password below) and a bookable provider profile — dormant until you set its coverage
              and services on the Employees page.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            {formErrors.base ? (
              <div
                aria-live="polite"
                className="mb-4 border border-[#b75c68]/25 bg-[#fff5f6] px-4 py-3 text-sm font-semibold text-[#8f3f4b]"
              >
                {formErrors.base}
              </div>
            ) : null}
            {form ? (
              <>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <Field error={formErrors.name} label="Name">
                    <input
                      aria-invalid={Boolean(formErrors.name)}
                      className={fieldClass(formErrors.name)}
                      onChange={(event) => updateForm("name", event.target.value)}
                      value={form.name ?? ""}
                    />
                  </Field>
                  <Field error={formErrors.platform_fee_pct} label="Platform fee (%)">
                    <input
                      aria-invalid={Boolean(formErrors.platform_fee_pct)}
                      className={fieldClass(formErrors.platform_fee_pct)}
                      max="100"
                      min="0"
                      onChange={(event) => updateForm("platform_fee_pct", event.target.value)}
                      step="0.5"
                      type="number"
                      value={form.platform_fee_pct ?? ""}
                    />
                  </Field>
                  <Field error={formErrors.email} label="Email (login)">
                    <input
                      aria-invalid={Boolean(formErrors.email)}
                      className={fieldClass(formErrors.email)}
                      onChange={(event) => updateForm("email", event.target.value)}
                      placeholder="partner's own email"
                      type="email"
                      value={form.email ?? ""}
                    />
                  </Field>
                  <Field error={formErrors.phone} label="Phone">
                    <input
                      aria-invalid={Boolean(formErrors.phone)}
                      className={fieldClass(formErrors.phone)}
                      onChange={(event) => updateForm("phone", event.target.value)}
                      value={form.phone ?? ""}
                    />
                  </Field>
                  {!editingId && (
                    <Field error={formErrors.password} label="Login password (optional)">
                      <input
                        aria-invalid={Boolean(formErrors.password)}
                        className={fieldClass(formErrors.password)}
                        onChange={(event) => updateForm("password", event.target.value)}
                        placeholder="auto-generated if blank"
                        type="text"
                        value={form.password ?? ""}
                      />
                    </Field>
                  )}
                  <Field error={formErrors.status} label="Status">
                    <Select
                      onValueChange={(value) => updateForm("status", value as Partner["status"])}
                      value={form.status ?? "active"}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <div className="mt-4">
                  <Field error={formErrors.payout_notes} label="Payout notes">
                    <input
                      aria-invalid={Boolean(formErrors.payout_notes)}
                      className={fieldClass(formErrors.payout_notes)}
                      onChange={(event) => updateForm("payout_notes", event.target.value)}
                      placeholder="e-transfer email, bank ref..."
                      value={form.payout_notes ?? ""}
                    />
                  </Field>
                </div>
              </>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <Button size="sm" disabled={create.isPending || update.isPending} onClick={save} style={{ background: "#c96c83", border: "none", color: "#fff" }}>
              {create.isPending || update.isPending ? "Saving..." : "Save"}
            </Button>
            <Button size="sm" variant="ghost" onClick={closeEditor}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <DashboardPanel>
          <p className="text-sm text-[#5f6268]">Loading partners...</p>
        </DashboardPanel>
      ) : partners.length === 0 ? (
        <EmptyState
          action={
            <Button size="sm" onClick={startCreate} style={{ background: "#c96c83", border: "none", color: "#fff" }}>
              <Plus aria-hidden="true" />
              Add Partner
            </Button>
          }
          icon={Handshake}
          title="No partners yet"
          description="Add partner businesses that supply providers to the B.A.Y.D pool."
        />
      ) : (
        <div className="space-y-3" data-tour="admin-partners-list">
          {partners.map((p) => (
            <DashboardPanel className="p-0" key={p.id}>
              <div className="px-5 py-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base font-extrabold text-[#101217]">{p.name}</span>
                    <StatusBadgeFor status={p.status} />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#5f6268]">
                    {p.providers_count} provider{p.providers_count === 1 ? "" : "s"} · {p.covered_fsas.length} FSA · {Number(p.platform_fee_pct)}% platform fee
                  </p>
                  <p className="mt-1 text-sm">
                    <span className="text-[#5f6268]">Owed now: </span>
                    <span className="font-semibold text-[#c96c83]">{cad(p.pending.owed)}</span>
                    <span className="text-[#8a8d93]"> ({p.pending.booking_count} booking{p.pending.booking_count === 1 ? "" : "s"}, gross {cad(p.pending.gross)})</span>
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button size="xs" variant="outline" onClick={() => setOpenId(openId === p.id ? null : p.id)}>{openId === p.id ? "Hide" : "Details"}</Button>
                  <Button size="xs" variant="outline" onClick={() => startEdit(p)}>Edit</Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="xs" variant="outline" disabled={del.isPending}>
                        <Trash2 className="size-3.5 text-[#d4754a]" />
                        <span className="sr-only">Delete {p.name}</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete partner?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This removes {p.name}. Assigned providers and bookings stay in the system, but they will be unlinked from this partner.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deletePartner(p)}>
                          Delete partner
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              {openId === p.id && <PartnerDetail partnerId={p.id} owed={p.pending.owed} pendingCount={p.pending.booking_count} />}
              </div>
            </DashboardPanel>
          ))}
        </div>
      )}

      <TutorialButton steps={adminPartnersSteps} pageKey="admin-partners" />
    </DashboardPage>
  )
}

function PartnerDetail({ partnerId, owed, pendingCount }: { partnerId: number; owed: string; pendingCount: number }) {
  const { toast } = useToast()
  const { data, isLoading } = usePartnerDetail(partnerId)
  const settle = useSettlePartner()
  const markPaid = useMarkPayoutPaid()

  if (isLoading || !data) return <div className="mt-3 text-xs text-[#5f6268]">Loading…</div>

  return (
    <div className="mt-4 space-y-5 border-t border-black/8 pt-4">
      {/* Providers */}
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#6b6f76]">Providers</p>
        {data.providers.length === 0 ? (
          <p className="text-xs text-[#8a8d93]">None assigned. Set a provider&apos;s partner on the Employees page.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {data.providers.map((ep) => (
              <span key={ep.id} className="text-[11px] px-2 py-0.5 rounded-full bg-black/5 text-[#101217]">
                {[ep.user?.first_name, ep.user?.last_name].filter(Boolean).join(" ")} · {ep.service_fsas.length} FSA
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Settle */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-[#5f6268]">Owed now: <span className="font-semibold text-[#c96c83]">{cad(owed)}</span></p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="xs" disabled={pendingCount === 0 || settle.isPending}
              style={{ background: pendingCount === 0 ? "#e5e5e5" : "#101217", border: "none", color: "#fff" }}>
              {settle.isPending ? "Settling..." : `Create payout${pendingCount ? ` (${cad(owed)})` : ""}`}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Create partner payout?</AlertDialogTitle>
              <AlertDialogDescription>
                This will settle {pendingCount} completed booking{pendingCount === 1 ? "" : "s"} into a pending payout for {cad(owed)}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => settle.mutate(partnerId, {
                  onSuccess: () => toast({ title: "Payout created", description: `${cad(owed)} is ready for payment.`, variant: "success" }),
                  onError: (error: unknown) => {
                    toast({
                      title: "Payout not created",
                      description: getApiErrorMessage(error, "Could not create this partner payout."),
                      variant: "error",
                    })
                  },
                })}
              >
                Create payout
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Payout history */}
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#6b6f76]">Payout history</p>
        {data.payouts.length === 0 ? (
          <p className="text-xs text-[#8a8d93]">No payouts yet.</p>
        ) : (
          <div className="space-y-1.5">
            {data.payouts.map((po) => (
              <div key={po.id} className="flex items-center justify-between gap-3 text-xs">
                <span className="text-[#5f6268]">
                  {dt(po.created_at)} · {po.booking_count} bookings · gross {cad(po.gross)} − fee {cad(po.fee_amount)} ={" "}
                  <span className="font-semibold text-[#101217]">{cad(po.amount)}</span>
                </span>
                {po.status === "paid" ? (
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: "#5a9e5a22", color: "#5a9e5a" }}>
                    Paid {dt(po.paid_at)}
                  </span>
                ) : (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="xs" variant="outline" disabled={markPaid.isPending}>Mark paid</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Mark payout paid?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This records payout {cad(po.amount)} as paid and sets its paid date.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => markPaid.mutate(
                            { id: po.id },
                            {
                              onSuccess: () => toast({ title: "Payout marked paid", description: `${cad(po.amount)} was recorded as paid.`, variant: "success" }),
                              onError: (error: unknown) => {
                                toast({
                                  title: "Payout not updated",
                                  description: getApiErrorMessage(error, "Could not mark this payout paid."),
                                  variant: "error",
                                })
                              },
                            }
                          )}
                        >
                          Mark paid
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const inputCls =
  "h-10 w-full border border-black/15 bg-white px-3 text-sm text-[#101217] outline-none transition focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20"
const errorInputCls =
  "border-[#b75c68] focus:border-[#b75c68] focus:ring-[#b75c68]/20"

function Field({ label, children, error }: { label: string; children: ReactNode; error?: string }) {
  return (
    <label>
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-[#6b6f76]">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-xs font-semibold text-[#b75c68]">{error}</span> : null}
    </label>
  )
}

function fieldClass(error?: string) {
  return `${inputCls} ${error ? errorInputCls : ""}`
}

function normalizePartnerInput(input: PartnerInput): PartnerInput {
  return {
    name: input.name?.trim(),
    email: input.email?.trim() || "",
    phone: input.phone?.trim() || "",
    platform_fee_pct: input.platform_fee_pct?.trim(),
    status: input.status,
    payout_notes: input.payout_notes?.trim() || "",
    // Carried through so a create sets the partner-provider's login password;
    // omitted (undefined → dropped) when blank so edits don't touch it.
    ...(input.password?.trim() ? { password: input.password.trim() } : {}),
  }
}

function getPartnerFieldErrors(error: z.ZodError<PartnerInput>): PartnerFormErrors {
  const next: PartnerFormErrors = {}
  for (const issue of error.issues) {
    const key = issue.path[0]
    if (typeof key === "string" && !next[key as keyof PartnerFormErrors]) {
      next[key as keyof PartnerFormErrors] = issue.message
    }
  }
  next.base = "Check the highlighted fields and try again."
  return next
}

function getApiErrorMessage(error: unknown, fallback: string) {
  const data = (error as { response?: { data?: { error?: string; errors?: string[] } } })?.response?.data
  return data?.error ?? data?.errors?.join(", ") ?? fallback
}
