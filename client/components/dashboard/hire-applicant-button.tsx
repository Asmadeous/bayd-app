"use client"

import { useState } from "react"
import Link from "next/link"
import { useMutation, useQueryClient } from "@tanstack/react-query"

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
import api from "@/lib/api"
import type { AdminJobApplication } from "@/lib/hooks/use-admin"
import { staffEmailDomain } from "@/lib/stores/franchise-store"

const inputClass =
  "h-10 w-full border border-black/15 bg-white px-3 text-sm text-[#101217] outline-none focus:border-[#c96c83]"

function splitName(name: string) {
  const [first = "", ...rest] = name.trim().split(/\s+/)
  return { first, last: rest.join(" ") }
}

// Staff sign in with a first-name company address (e.g. maria@baydspa.ca),
// on their franchise's staff domain.
function suggestedEmail(first: string) {
  const local = first.toLowerCase().normalize("NFD").replace(/[^a-z]/g, "")
  return local ? `${local}@${staffEmailDomain()}` : ""
}

// Hire an applicant: confirm their details, pick their staff sign-in email,
// and the server creates the account and emails them a set-password link.
export function HireApplicantButton({ application }: { application: AdminJobApplication }) {
  const { toast } = useToast()
  const qc = useQueryClient()
  const { first, last } = splitName(application.name)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    first_name: first,
    last_name: last,
    email: suggestedEmail(first),
    phone: application.phone ?? "",
    title: application.job_title ?? "",
  })
  const [hired, setHired] = useState<{ email: string } | null>(null)

  const hire = useMutation({
    mutationFn: () =>
      api
        .post<{ employee_profile_id: number; email: string }>(`/admin/job_applications/${application.id}/hire`, { hire: form })
        .then((r) => r.data),
    onSuccess: (data) => {
      setHired({ email: data.email })
      qc.invalidateQueries({ queryKey: ["admin-job-applications"] })
      qc.invalidateQueries({ queryKey: ["admin-employees"] })
    },
    onError: (e) => {
      const message = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Please try again."
      toast({ title: "Not hired", description: message, variant: "error" })
    },
  })

  // Keep the dialog up after hiring so the admin sees the next steps; the row
  // switches to "Hired" once it closes.
  if (application.employee_profile_id && !hired) {
    return (
      <Link href="/dashboard/admin/employees" className="text-xs font-semibold text-[#5a9e5a] hover:underline">
        Hired · view staff
      </Link>
    )
  }

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }))

  return (
    <>
      <Button size="xs" onClick={() => setOpen(true)} style={{ background: "#5a9e5a", border: "none", color: "#fff" }}>
        Hire
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) setHired(null)
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader className="pr-14">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a36f4d]">Hiring</p>
            <DialogTitle>{hired ? `${form.first_name} is on the team` : `Hire ${application.name}`}</DialogTitle>
            <DialogDescription>
              {hired
                ? `We emailed ${application.email} a link to set their password.`
                : `Creates their staff account and emails ${application.email} a link to set a password.`}
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-3">
            {hired ? (
              <div className="space-y-2 text-sm text-[#101217]">
                <p>
                  They sign in with <span className="font-bold">{hired.email}</span>. Before they can take jobs:
                </p>
                <ol className="list-decimal space-y-1 pl-5 text-[#4b4f56]">
                  <li>On Employees, set their services, service areas and Hours.</li>
                  <li>
                    Invite {application.email} to the BAYD Staff app: add them as a tester in TestFlight (iPhone) and in
                    Google Play internal testing (Android).
                  </li>
                  <li>Create the {hired.email} mailbox if they should receive staff email there.</li>
                </ol>
              </div>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label>
                    <span className="mb-1 block text-xs font-bold text-[#6b6f76]">First name</span>
                    <input className={inputClass} value={form.first_name} onChange={(e) => set({ first_name: e.target.value })} />
                  </label>
                  <label>
                    <span className="mb-1 block text-xs font-bold text-[#6b6f76]">Last name</span>
                    <input className={inputClass} value={form.last_name} onChange={(e) => set({ last_name: e.target.value })} />
                  </label>
                </div>
                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-[#6b6f76]">Staff sign-in email (@{staffEmailDomain()})</span>
                  <input className={inputClass} value={form.email} onChange={(e) => set({ email: e.target.value })} />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label>
                    <span className="mb-1 block text-xs font-bold text-[#6b6f76]">Phone</span>
                    <input className={inputClass} value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
                  </label>
                  <label>
                    <span className="mb-1 block text-xs font-bold text-[#6b6f76]">Title</span>
                    <input className={inputClass} value={form.title} onChange={(e) => set({ title: e.target.value })} />
                  </label>
                </div>
              </>
            )}
          </DialogBody>
          <DialogFooter>
            {hired ? (
              <Link href="/dashboard/admin/employees">
                <Button size="sm">Go to Employees</Button>
              </Link>
            ) : (
              <>
                <Button
                  size="sm"
                  disabled={hire.isPending || !form.first_name.trim() || !form.email.trim()}
                  onClick={() => hire.mutate()}
                >
                  {hire.isPending ? "Hiring..." : "Create staff account"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
