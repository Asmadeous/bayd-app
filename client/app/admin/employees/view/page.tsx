"use client"

import Link from "next/link"
import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { StaffCoverageEditor, StaffFormDialog, type StaffEmployee } from "@/components/dashboard/staff-editor"
import { StaffHoursSheet } from "@/components/dashboard/staff-hours-sheet"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { useConfirm, useToast } from "@/lib/app-ui/app-ui-provider"
import {
  useAdminAnalytics,
  useAdminEmployee,
  useDeleteEmployee,
  useToggleEmployeeShift,
  useUpdateEmployee,
  type AnalyticsPeriod,
} from "@/lib/hooks/use-admin"
import { useAdminPartners } from "@/lib/hooks/use-partners"
import { formatMoney } from "@/lib/stores/franchise-store"
import { AdminHeader } from "../../admin-header"
import { adminScreenClass, cardClass, displayClass, eyebrowClass, mutedClass } from "../../admin-theme"
import { apiError, fieldClass, FilterChips } from "../../ui"
import { Avatar, KPI_PERIOD_LABEL, KPI_PERIODS } from "../staff-shared"

export default function AdminEmployeeScreen() {
  // useSearchParams needs a Suspense boundary for the static export.
  return (
    <Suspense>
      <StaffDetail />
    </Suspense>
  )
}

// One staff member with everything their web Employees card does: toggle the
// shift, edit, bookable hours, delete, partner, service areas and KPIs.
function StaffDetail() {
  const id = Number(useSearchParams().get("id"))
  const { data, isLoading } = useAdminEmployee(id)
  const emp = data as StaffEmployee | undefined

  if (isLoading || !emp) {
    return (
      <div className={adminScreenClass}>
        <AdminHeader back title="Staff" />
        <p className={`px-5 text-sm ${mutedClass}`}>{isLoading ? "Loading…" : "Staff member not found."}</p>
      </div>
    )
  }
  return <Staff emp={emp} />
}

function Staff({ emp }: { emp: StaffEmployee }) {
  const router = useRouter()
  const { toast } = useToast()
  const confirm = useConfirm()
  const toggleShift = useToggleEmployeeShift(emp.id)
  const update = useUpdateEmployee(emp.id)
  const del = useDeleteEmployee()
  const { data: partnersData } = useAdminPartners()
  const partners = partnersData?.data ?? []
  const [editing, setEditing] = useState(false)
  const [hoursOpen, setHoursOpen] = useState(false)
  const [period, setPeriod] = useState<AnalyticsPeriod>("30d")
  const { data: analytics } = useAdminAnalytics(period)
  const kpi = analytics?.employees.find((e) => e.id === emp.id)
  const name = [emp.user?.first_name, emp.user?.last_name].filter(Boolean).join(" ")

  async function remove() {
    const ok = await confirm({
      title: "Delete staff member?",
      message: `This removes ${name || "this staff member"}'s profile and login. Staff with bookings or tips cannot be deleted; set them inactive instead.`,
      confirmLabel: "Delete staff member",
      tone: "danger",
    })
    if (!ok) return
    del.mutate(emp.id, {
      onSuccess: () => {
        toast({ title: "Staff member deleted", description: `${name || "Staff member"} was removed.`, variant: "success" })
        router.back()
      },
      onError: (e) => toast({ title: "Staff member not deleted", description: apiError(e, "This staff member could not be deleted."), variant: "error" }),
    })
  }

  const button = "h-10 rounded-xl border border-black/10 bg-white px-4 text-sm font-bold disabled:opacity-40"
  return (
    <div className={adminScreenClass}>
      <AdminHeader back title="Staff" />
      {editing ? <StaffFormDialog mode={emp} partners={partners} onClose={() => setEditing(false)} /> : null}
      <StaffHoursSheet employeeId={emp.id} name={name} dispatchable={emp.dispatchable} open={hoursOpen} onOpenChange={setHoursOpen} />

      <div className="space-y-4 px-5">
        <section className={`${cardClass} p-5`}>
          <div className="flex items-center gap-3">
            <Avatar photo={emp.photo_url} name={name} size="size-14" />
            <div className="min-w-0">
              <p className={`${displayClass} truncate text-xl`}>{name}</p>
              {emp.title ? <p className="text-sm font-bold text-[#a36f4d]">{emp.title}</p> : null}
            </div>
          </div>
          <p className="mt-3 break-all text-sm">{emp.user?.email}</p>
          {emp.user?.phone ? (
            <a href={`tel:${emp.user.phone}`} className="text-sm font-semibold text-[#C96C83]">
              {emp.user.phone}
            </a>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {!emp.dispatchable ? <StatusBadge tone="red">Auto-assign paused</StatusBadge> : null}
            <StatusBadge tone={emp.on_shift ? "green" : "gray"}>{emp.on_shift ? "On Shift" : "Off Shift"}</StatusBadge>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className={button}
              disabled={toggleShift.isPending}
              onClick={() =>
                toggleShift.mutate(undefined, {
                  onError: (e) => toast({ title: "Shift status not updated", description: apiError(e, "Could not update this staff member's shift status."), variant: "error" }),
                })
              }
            >
              Toggle Shift
            </button>
            <button type="button" className={button} onClick={() => setEditing(true)}>
              Edit
            </button>
            <button type="button" className={button} onClick={() => setHoursOpen(true)}>
              Hours
            </button>
            <button type="button" className={`${button} text-[#8f3f4b]`} disabled={del.isPending} onClick={remove}>
              Delete
            </button>
          </div>
        </section>

        <section className={`${cardClass} space-y-2 p-5`}>
          <p className={eyebrowClass}>Partner</p>
          <select
            aria-label="Partner"
            disabled={update.isPending}
            value={emp.partner_id != null ? String(emp.partner_id) : ""}
            onChange={(e) =>
              update.mutate(
                { partner_id: e.target.value ? Number(e.target.value) : null },
                { onError: (err) => toast({ title: "Partner not saved", description: apiError(err, "Could not update this staff member's partner."), variant: "error" }) },
              )
            }
            className={fieldClass}
          >
            <option value="">In-house (B.A.Y.D)</option>
            {partners.map((p) => (
              <option key={p.id} value={String(p.id)}>
                {p.name}
              </option>
            ))}
          </select>
        </section>

        <section className={`${cardClass} p-5`}>
          <StaffCoverageEditor employee={emp} className="space-y-1" />
        </section>

        <section className={`${cardClass} space-y-3 p-5`}>
          <p className={eyebrowClass}>Performance</p>
          <FilterChips options={KPI_PERIODS} value={period} onChange={setPeriod} label={(p) => KPI_PERIOD_LABEL[p]} />
          <div className="grid grid-cols-3 gap-3">
            <Kpi label="Completed" value={kpi?.bookings_completed ?? 0} />
            <Kpi label="Revenue" value={formatMoney(kpi?.revenue ?? 0, { maximumFractionDigits: 0 })} />
            <Kpi label="Rating" value={kpi?.average_rating != null ? kpi.average_rating.toFixed(1) : "-"} />
            <Kpi label="Cancels" value={kpi?.cancellations ?? 0} />
            <Kpi label="Missed" value={kpi?.missed ?? 0} />
          </div>
          <Link href={`/admin/employees/detail?id=${emp.id}`} className="block text-sm font-bold text-[#C96C83]">
            View detailed KPIs →
          </Link>
        </section>
      </div>
    </div>
  )
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-lg font-bold leading-tight">{value}</p>
      <p className={`text-xs uppercase tracking-wide ${mutedClass}`}>{label}</p>
    </div>
  )
}
