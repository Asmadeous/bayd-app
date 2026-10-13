"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { useToast } from "@/lib/app-ui/app-ui-provider"
import { useCreatePartner, usePartnerDetail, useUpdatePartner, type Partner, type PartnerInput } from "@/lib/hooks/use-partners"
import { BLANK, getPartnerFieldErrors, normalizePartnerInput, partnerSchema, type PartnerFormErrors } from "@/lib/partner-form"
import { AdminHeader } from "../../admin-header"
import { adminScreenClass, cardClass, mutedClass } from "../../admin-theme"
import { apiError, fieldClass } from "../../ui"

export default function AdminPartnerEditScreen() {
  // useSearchParams needs a Suspense boundary for the static export.
  return (
    <Suspense>
      <PartnerEditLoader />
    </Suspense>
  )
}

// New partner without an id, edit with one; the same rules as the web dialog.
function PartnerEditLoader() {
  const id = Number(useSearchParams().get("id"))
  const { data, isLoading } = usePartnerDetail(id > 0 ? id : null)
  if (id > 0 && (isLoading || !data)) {
    return (
      <div className={adminScreenClass}>
        <AdminHeader back title="Edit partner" />
        <p className={`px-5 text-sm ${mutedClass}`}>{isLoading ? "Loading…" : "Partner not found."}</p>
      </div>
    )
  }
  return <PartnerForm partner={data?.partner} />
}

function PartnerForm({ partner }: { partner?: Partner }) {
  const router = useRouter()
  const { toast } = useToast()
  const create = useCreatePartner()
  const update = useUpdatePartner()
  const [form, setForm] = useState<PartnerInput>(
    partner
      ? {
          name: partner.name,
          email: partner.email ?? "",
          phone: partner.phone ?? "",
          platform_fee_pct: partner.platform_fee_pct,
          status: partner.status,
          payout_notes: partner.payout_notes ?? "",
        }
      : BLANK,
  )
  const [errors, setErrors] = useState<PartnerFormErrors>({})
  const saving = create.isPending || update.isPending

  function set<K extends keyof PartnerInput>(key: K, value: PartnerInput[K]) {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => {
      if (!current[key] && !current.base) return current
      const next = { ...current }
      delete next[key]
      delete next.base
      return next
    })
  }

  function save() {
    const result = partnerSchema.safeParse(form)
    if (!result.success) {
      setErrors(getPartnerFieldErrors(result.error))
      return
    }
    // On create, email is the partner-provider's login, so it's required.
    if (!partner && !form.email?.trim()) {
      setErrors({ email: "Email is required, it's the partner's login." })
      return
    }
    const payload = normalizePartnerInput(form)
    const opts = {
      onSuccess: () => {
        toast({ title: partner ? "Partner saved" : "Partner created", variant: "success" })
        router.back()
      },
      onError: (e: unknown) => {
        const message = apiError(e, partner ? "Could not update this partner." : "Could not create this partner.")
        setErrors({ base: message })
        toast({ title: partner ? "Partner not saved" : "Partner not created", description: message, variant: "error" })
      },
    }
    if (partner) update.mutate({ id: partner.id, ...payload }, opts)
    else create.mutate(payload, opts)
  }

  const input = (key: keyof PartnerFormErrors) => `${fieldClass} ${errors[key] ? "border-[#b75c68]" : ""}`
  return (
    <div className={adminScreenClass}>
      <AdminHeader back title={partner ? "Edit partner" : "New partner"} />
      <div className="space-y-4 px-5">
        {!partner ? (
          <p className={`text-sm ${mutedClass}`}>
            Creating a partner also creates a provider login (they sign in with the email and password below) and a bookable provider profile, dormant
            until you set its coverage and services under Employees.
          </p>
        ) : null}
        {errors.base ? <p className="rounded-xl bg-[#fff5f6] px-4 py-3 text-sm font-semibold text-[#8f3f4b]">{errors.base}</p> : null}

        <section className={`${cardClass} space-y-4 p-5`}>
          <Field label="Name" error={errors.name}>
            <input className={input("name")} value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label="Platform fee (%)" error={errors.platform_fee_pct}>
            <input
              className={input("platform_fee_pct")}
              type="number"
              inputMode="decimal"
              min="0"
              max="100"
              step="0.5"
              value={form.platform_fee_pct ?? ""}
              onChange={(e) => set("platform_fee_pct", e.target.value)}
            />
          </Field>
          <Field label="Email (login)" error={errors.email}>
            <input
              className={input("email")}
              type="email"
              autoCapitalize="none"
              placeholder="partner's own email"
              value={form.email ?? ""}
              onChange={(e) => set("email", e.target.value)}
            />
          </Field>
          <Field label="Phone" error={errors.phone}>
            <input className={input("phone")} type="tel" value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} />
          </Field>
          {!partner ? (
            <Field label="Login password (optional)" error={errors.password}>
              <input
                className={input("password")}
                autoCapitalize="none"
                placeholder="auto-generated if blank"
                value={form.password ?? ""}
                onChange={(e) => set("password", e.target.value)}
              />
            </Field>
          ) : null}
          <Field label="Status" error={errors.status}>
            <select className={input("status")} value={form.status ?? "active"} onChange={(e) => set("status", e.target.value as Partner["status"])}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </Field>
          <Field label="Payout notes" error={errors.payout_notes}>
            <input
              className={input("payout_notes")}
              placeholder="e-transfer email, bank ref…"
              value={form.payout_notes ?? ""}
              onChange={(e) => set("payout_notes", e.target.value)}
            />
          </Field>
        </section>

        <button type="button" disabled={saving} onClick={save} className="h-12 w-full rounded-xl bg-[#C96C83] text-base font-bold text-white disabled:opacity-40">
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className={`mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] ${mutedClass}`}>{label}</span>
      {children}
      {error ? <span className="mt-1 block text-xs font-semibold text-[#b75c68]">{error}</span> : null}
    </label>
  )
}
