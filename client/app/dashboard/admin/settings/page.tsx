"use client"

import { useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { CheckCircle2 } from "lucide-react"

import { useToast } from "@/components/bayd-toast-provider"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardPage } from "@/components/dashboard/dashboard-page"
import { DashboardPanel } from "@/components/dashboard/dashboard-panel"
import { TutorialButton } from "@/components/dashboard/tutorial-button"
import { Button } from "@/components/ui/button"
import { ChangePasswordForm } from "@/components/change-password-form"
import api from "@/lib/api"
import { useAuth } from "@/lib/hooks/use-auth"
import { useAuthStore } from "@/lib/stores/auth-store"
import { adminSettingsSteps } from "@/lib/tours/admin-settings-tour"

interface Settings {
  group_deposit_pct: string
  invoice_hst_number?: string
  invoice_business_address?: string
}

const fieldClass =
  "h-10 w-full border border-black/15 bg-white px-3 text-sm font-semibold text-[#101217] outline-none transition-colors focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20"
const labelClass = "mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-[#6b6f76]"

// Business details printed on every new invoice. Blank prints nothing: the
// GST/HST number must be the real registration number, never a placeholder.
function InvoiceDetailsPanel({ settings }: { settings?: Settings }) {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [hst, setHst] = useState<string | null>(null)
  const [address, setAddress] = useState<string | null>(null)
  const hstValue = hst ?? settings?.invoice_hst_number ?? ""
  const addressValue = address ?? settings?.invoice_business_address ?? ""

  const save = useMutation({
    mutationFn: () =>
      api
        .patch("/admin/settings", { invoice_hst_number: hstValue.trim(), invoice_business_address: addressValue.trim() })
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-settings"] })
      setHst(null)
      setAddress(null)
      toast({ title: "Invoice details saved", description: "New invoices will show them.", variant: "success" })
    },
    onError: (error: unknown) =>
      toast({ title: "Invoice details not saved", description: getApiErrorMessage(error, "Please try again."), variant: "error" }),
  })

  return (
    <DashboardPanel>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a36f4d]">Invoices</p>
      <h2 className="mt-1 text-lg font-extrabold text-[#101217]">Business details on invoices</h2>
      <p className="mt-2 text-xs leading-5 text-[#5f6268]">
        Printed on every new invoice. Canadian invoices should show your GST/HST registration number. Leave a field blank to leave it off.
      </p>
      <div className="mt-5 grid max-w-2xl gap-4 sm:grid-cols-2">
        <label>
          <span className={labelClass}>GST/HST number</span>
          <input className={fieldClass} value={hstValue} onChange={(e) => setHst(e.target.value)} placeholder="123456789 RT0001" />
        </label>
        <label>
          <span className={labelClass}>Business address</span>
          <input className={fieldClass} value={addressValue} onChange={(e) => setAddress(e.target.value)} placeholder="Street, City, Province, Postal code" />
        </label>
      </div>
      <Button className="mt-4" size="sm" disabled={save.isPending} onClick={() => save.mutate()}>
        {save.isPending ? "Saving..." : "Save invoice details"}
      </Button>
    </DashboardPanel>
  )
}

function AdminProfilePanel() {
  const { toast } = useToast()
  const { user } = useAuthStore()
  const { updateMe } = useAuth()
  const [form, setForm] = useState({
    first_name: user?.first_name ?? "",
    last_name: user?.last_name ?? "",
    phone: user?.phone ?? "",
  })
  const [saved, setSaved] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      await updateMe.mutateAsync(form)
      setSaved(true)
      toast({ title: "Profile saved", variant: "success" })
      setTimeout(() => setSaved(false), 2500)
    } catch (error) {
      toast({
        title: "Profile not saved",
        description: getApiErrorMessage(error, "Could not save your profile."),
        variant: "error",
      })
    }
  }

  return (
    <DashboardPanel data-tour="admin-settings-profile">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a36f4d]">Account</p>
      <h2 className="mt-1 text-lg font-extrabold text-[#101217]">My Profile</h2>

      <form className="mt-5 max-w-md space-y-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>First name</label>
            <input
              className={fieldClass}
              value={form.first_name}
              onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelClass}>Last name</label>
            <input
              className={fieldClass}
              value={form.last_name}
              onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Phone</label>
          <input
            className={fieldClass}
            type="tel"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
        </div>

        <div>
          <label className={labelClass}>Email</label>
          <input
            className={`${fieldClass} cursor-not-allowed bg-[#f4f1eb] text-[#5f6268]`}
            readOnly
            value={user?.email ?? ""}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Button
            disabled={updateMe.isPending}
            type="submit"
            style={{ background: "#c96c83", border: "none", color: "#fff" }}
          >
            {updateMe.isPending ? "Saving..." : "Save Changes"}
          </Button>
          {saved ? (
            <span className="inline-flex items-center gap-1.5 text-sm font-bold text-[#5a9e5a]">
              <CheckCircle2 aria-hidden="true" className="size-4" />
              Saved
            </span>
          ) : null}
        </div>
      </form>
    </DashboardPanel>
  )
}

export default function AdminSettingsPage() {
  const { toast } = useToast()
  const qc = useQueryClient()
  const { data, isError, isLoading } = useQuery<Settings>({
    queryKey: ["admin-settings"],
    queryFn: () => api.get<Settings>("/admin/settings").then((r) => r.data),
  })

  const [edited, setEdited] = useState<string | null>(null)
  const depositPct = edited ?? (data?.group_deposit_pct != null ? String(data.group_deposit_pct) : "")
  const depositNumber = Number(depositPct)
  const depositError =
    depositPct.trim() === ""
      ? "Deposit percentage is required."
      : !Number.isFinite(depositNumber)
        ? "Deposit percentage must be a number."
        : depositNumber < 0 || depositNumber > 100
          ? "Deposit percentage must be between 0 and 100."
          : null

  const save = useMutation({
    mutationFn: () => api.patch("/admin/settings", { group_deposit_pct: depositNumber }).then((r) => r.data),
    onSuccess: () => {
      setEdited(null)
      qc.invalidateQueries({ queryKey: ["admin-settings"] })
      toast({ title: "Settings saved", variant: "success" })
    },
    onError: (error: unknown) => {
      toast({
        title: "Settings not saved",
        description: getApiErrorMessage(error, "Could not save admin settings."),
        variant: "error",
      })
    },
  })

  useEffect(() => {
    if (isError) {
      toast({
        title: "Settings not loaded",
        description: "Could not load admin settings.",
        variant: "error",
      })
    }
  }, [isError, toast])

  function saveDeposit() {
    if (depositError) {
      toast({
        title: "Deposit needs attention",
        description: depositError,
        variant: "error",
      })
      return
    }

    save.mutate()
  }

  return (
    <DashboardPage maxWidth="narrow">
      <div data-tour="admin-settings-header">
        <DashboardHeader title="Settings" subtitle="Your profile, plus booking and payment configuration." />
      </div>

      <AdminProfilePanel />

      <DashboardPanel data-tour="admin-settings-deposit">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a36f4d]">
          Payments
        </p>
        <h2 className="mt-1 text-lg font-extrabold text-[#101217]">Group Booking Deposit</h2>

        <div className="mt-5 max-w-md">
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-[#6b6f76]">
            Deposit percentage
          </label>
          <input
            aria-invalid={Boolean(depositError)}
            className={`h-10 w-full border bg-white px-3 text-sm text-[#101217] outline-none transition focus:ring-3 ${
              depositError
                ? "border-[#b75c68] focus:border-[#b75c68] focus:ring-[#b75c68]/20"
                : "border-black/15 focus:border-[#c96c83] focus:ring-[#c96c83]/20"
            }`}
            max="100"
            min="0"
            onChange={(event) => setEdited(event.target.value)}
            step="1"
            type="number"
            value={depositPct}
          />
          {depositError ? (
            <p className="mt-2 text-xs font-semibold text-[#b75c68]">{depositError}</p>
          ) : null}
          <p className="mt-2 text-xs leading-5 text-[#5f6268]">
            Percentage of the total collected upfront when a customer books a group service.
          </p>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button
            disabled={isLoading || save.isPending}
            onClick={saveDeposit}
            style={{ background: "#c96c83", border: "none", color: "#fff" }}
          >
            {save.isPending ? "Saving..." : "Save"}
          </Button>
          {save.isSuccess ? <p className="text-xs font-semibold text-green-700">Saved.</p> : null}
        </div>
      </DashboardPanel>

      <InvoiceDetailsPanel settings={data} />

      <DashboardPanel>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a36f4d]">
          Security
        </p>
        <h2 className="mt-1 text-lg font-extrabold text-[#101217]">Change Password</h2>
        <p className="mt-2 text-xs leading-5 text-[#5f6268]">
          Enter your current password and choose a new one. You&apos;ll stay signed in.
        </p>
        <div className="mt-5 max-w-md">
          <ChangePasswordForm />
        </div>
      </DashboardPanel>

      <TutorialButton steps={adminSettingsSteps} pageKey="admin-settings" />
    </DashboardPage>
  )
}

function getApiErrorMessage(error: unknown, fallback: string) {
  const data = (error as { response?: { data?: { error?: string; errors?: string[] } } })?.response?.data
  return data?.error ?? data?.errors?.join(", ") ?? fallback
}
