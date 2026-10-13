"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { ChangePasswordForm } from "@/components/change-password-form"
import api from "@/lib/api"
import { useToast } from "@/lib/app-ui/app-ui-provider"
import { useAuth } from "@/lib/hooks/use-auth"
import { useAuthStore } from "@/lib/stores/auth-store"
import { AdminHeader } from "../admin-header"
import { adminScreenClass, cardClass, eyebrowClass, mutedClass } from "../admin-theme"
import { apiError, fieldClass } from "../ui"

interface Settings {
  group_deposit_pct: string
  invoice_hst_number?: string
  invoice_business_address?: string
}

// The web Settings page (Payments in the menu): your profile, the group
// booking deposit, business details on invoices, and your password.
export default function AdminSettingsScreen() {
  const { data, isLoading } = useQuery<Settings>({
    queryKey: ["admin-settings"],
    queryFn: () => api.get<Settings>("/admin/settings").then((r) => r.data),
  })

  return (
    <div className={adminScreenClass}>
      <AdminHeader title="Settings" />
      <p className={`px-5 pb-3 text-sm ${mutedClass}`}>Your profile, plus booking and payment configuration.</p>
      <div className="space-y-4 px-5">
        <ProfileCard />
        <DepositCard settings={data} loading={isLoading} />
        <InvoiceDetailsCard settings={data} />
        <section className={`${cardClass} p-5`}>
          <p className={eyebrowClass}>Change password</p>
          <p className={`mb-3 mt-1 text-sm ${mutedClass}`}>Enter your current password and choose a new one. You&apos;ll stay signed in.</p>
          <ChangePasswordForm />
        </section>
      </div>
    </div>
  )
}

function ProfileCard() {
  const { toast } = useToast()
  const user = useAuthStore((s) => s.user)
  const { updateMe } = useAuth()
  const [form, setForm] = useState({ first_name: user?.first_name ?? "", last_name: user?.last_name ?? "", phone: user?.phone ?? "" })

  async function save() {
    try {
      await updateMe.mutateAsync(form)
      toast({ title: "Profile saved", variant: "success" })
    } catch (e) {
      toast({ title: "Profile not saved", description: apiError(e, "Could not save your profile."), variant: "error" })
    }
  }

  return (
    <section className={`${cardClass} space-y-3 p-5`}>
      <p className={eyebrowClass}>My profile</p>
      <div className="grid grid-cols-2 gap-3">
        <Labeled label="First name">
          <input className={fieldClass} value={form.first_name} onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))} />
        </Labeled>
        <Labeled label="Last name">
          <input className={fieldClass} value={form.last_name} onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))} />
        </Labeled>
      </div>
      <Labeled label="Phone">
        <input className={fieldClass} type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
      </Labeled>
      <Labeled label="Email">
        <input className={`${fieldClass} bg-[#F4F2EF] ${mutedClass}`} readOnly value={user?.email ?? ""} />
      </Labeled>
      <button type="button" disabled={updateMe.isPending} onClick={save} className="h-11 w-full rounded-xl bg-[#C96C83] text-sm font-bold text-white disabled:opacity-40">
        {updateMe.isPending ? "Saving…" : "Save changes"}
      </button>
    </section>
  )
}

function DepositCard({ settings, loading }: { settings?: Settings; loading: boolean }) {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [edited, setEdited] = useState<string | null>(null)
  const value = edited ?? (settings?.group_deposit_pct != null ? String(settings.group_deposit_pct) : "")
  const n = Number(value)
  const error =
    value.trim() === ""
      ? "Deposit percentage is required."
      : !Number.isFinite(n)
        ? "Deposit percentage must be a number."
        : n < 0 || n > 100
          ? "Deposit percentage must be between 0 and 100."
          : null
  const save = useMutation({
    mutationFn: () => api.patch("/admin/settings", { group_deposit_pct: n }).then((r) => r.data),
    onSuccess: () => {
      setEdited(null)
      qc.invalidateQueries({ queryKey: ["admin-settings"] })
      toast({ title: "Settings saved", variant: "success" })
    },
    onError: (e) => toast({ title: "Settings not saved", description: apiError(e, "Could not save admin settings."), variant: "error" }),
  })

  return (
    <section className={`${cardClass} space-y-3 p-5`}>
      <p className={eyebrowClass}>Group booking deposit</p>
      <Labeled label="Deposit percentage">
        <input
          className={`${fieldClass} ${error ? "border-[#b75c68]" : ""}`}
          type="number"
          inputMode="decimal"
          min="0"
          max="100"
          step="1"
          value={value}
          onChange={(e) => setEdited(e.target.value)}
        />
      </Labeled>
      {error ? <p className="text-xs font-semibold text-[#b75c68]">{error}</p> : null}
      <p className={`text-xs ${mutedClass}`}>Percentage of the total collected upfront when a customer books a group service.</p>
      <button
        type="button"
        disabled={loading || save.isPending || !!error}
        onClick={() => save.mutate()}
        className="h-11 w-full rounded-xl bg-[#C96C83] text-sm font-bold text-white disabled:opacity-40"
      >
        {save.isPending ? "Saving…" : "Save"}
      </button>
    </section>
  )
}

// Printed on every new invoice; blank prints nothing (the GST/HST number must
// be the real registration number, never a placeholder).
function InvoiceDetailsCard({ settings }: { settings?: Settings }) {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [hst, setHst] = useState<string | null>(null)
  const [address, setAddress] = useState<string | null>(null)
  const hstValue = hst ?? settings?.invoice_hst_number ?? ""
  const addressValue = address ?? settings?.invoice_business_address ?? ""
  const save = useMutation({
    mutationFn: () => api.patch("/admin/settings", { invoice_hst_number: hstValue.trim(), invoice_business_address: addressValue.trim() }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-settings"] })
      setHst(null)
      setAddress(null)
      toast({ title: "Invoice details saved", description: "New invoices will show them.", variant: "success" })
    },
    onError: (e) => toast({ title: "Invoice details not saved", description: apiError(e, "Please try again."), variant: "error" }),
  })

  return (
    <section className={`${cardClass} space-y-3 p-5`}>
      <p className={eyebrowClass}>Business details on invoices and newsletters</p>
      <p className={`text-sm ${mutedClass}`}>
        Printed on every new invoice. Canadian invoices should show your GST/HST registration number. The business address also goes at the bottom of
        every newsletter, which Canada&apos;s anti-spam law requires. Leave a field blank to leave it off.
      </p>
      <Labeled label="GST/HST number">
        <input className={fieldClass} value={hstValue} onChange={(e) => setHst(e.target.value)} placeholder="123456789 RT0001" />
      </Labeled>
      <Labeled label="Business address">
        <input className={fieldClass} value={addressValue} onChange={(e) => setAddress(e.target.value)} placeholder="Street, City, Province, Postal code" />
      </Labeled>
      <button type="button" disabled={save.isPending} onClick={() => save.mutate()} className="h-11 w-full rounded-xl bg-[#14100F] text-sm font-bold text-white disabled:opacity-40">
        {save.isPending ? "Saving…" : "Save invoice details"}
      </button>
    </section>
  )
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className={`mb-1 block text-xs font-bold uppercase tracking-[0.12em] ${mutedClass}`}>{label}</span>
      {children}
    </label>
  )
}
