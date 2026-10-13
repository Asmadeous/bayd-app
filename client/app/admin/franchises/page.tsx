"use client"

import Link from "next/link"
import { ChevronRight, Plus } from "lucide-react"

import { useFranchises, type Franchise } from "@/lib/hooks/use-super"
import { AdminHeader } from "../admin-header"
import { adminScreenClass, cardClass, mutedClass } from "../admin-theme"
import { SuperGate } from "../super-gate"
import { EmptyCard } from "../ui"

const STATUS_STYLE: Record<Franchise["status"], string> = {
  live: "bg-[#5a9e5a]/15 text-[#3f7e47]",
  draft: "bg-[#d4a843]/15 text-[#8a6a1f]",
  suspended: "bg-black/[0.08] text-[#14100F]/65",
}

function countryName(code: string) {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code
  } catch {
    return code
  }
}

export default function AdminFranchisesScreen() {
  return (
    <SuperGate title="Franchises">
      <Franchises />
    </SuperGate>
  )
}

// The web Franchises page: every branch, its status and readiness.
function Franchises() {
  const { data: franchises = [], isLoading } = useFranchises()

  return (
    <div className={adminScreenClass}>
      <AdminHeader
        title="Franchises"
        action={
          <Link href="/admin/franchises/new" className="flex h-10 items-center gap-1 rounded-full bg-[#C96C83] px-4 text-sm font-bold text-white">
            <Plus className="size-4" aria-hidden /> New
          </Link>
        }
      />
      <p className={`px-5 pb-3 text-sm ${mutedClass}`}>Every branch, its setup and whether it&apos;s ready to take bookings.</p>
      <div className="space-y-3 px-5">
        {isLoading ? (
          <p className={`text-sm ${mutedClass}`}>Loading franchises…</p>
        ) : franchises.length === 0 ? (
          <EmptyCard title="No franchises yet" body="Create the first branch to get started." />
        ) : (
          franchises.map((f) => {
            const ready = Object.values(f.readiness).filter(Boolean).length
            const total = Object.keys(f.readiness).length
            return (
              <Link key={f.id} href={`/admin/franchises/view?id=${f.id}`} className={`${cardClass} flex items-center gap-3 p-4`}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-base font-bold">{f.name}</p>
                    <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-bold uppercase tracking-wide ${STATUS_STYLE[f.status]}`}>{f.status}</span>
                  </div>
                  <p className={`mt-1 text-sm ${mutedClass}`}>
                    {countryName(f.country_code)} · {f.currency} · {f.time_zone.replace(/_/g, " ")}
                    {f.is_default ? " · default" : ""}
                  </p>
                  <p className={`mt-1 text-xs font-semibold ${mutedClass}`}>
                    {f.admins.length} admin{f.admins.length === 1 ? "" : "s"} · ready {ready}/{total}
                  </p>
                </div>
                <ChevronRight className="size-5 shrink-0 text-[#14100F]/30" aria-hidden />
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
