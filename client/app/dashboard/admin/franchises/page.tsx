"use client"

import Link from "next/link"
import { MapPin, Plus } from "lucide-react"

import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardPage } from "@/components/dashboard/dashboard-page"
import { DashboardPanel } from "@/components/dashboard/dashboard-panel"
import { EmptyState } from "@/components/dashboard/empty-state"
import { SuperOnly } from "@/components/dashboard/super-only"
import { Button } from "@/components/ui/button"
import { useFranchises, type Franchise } from "@/lib/hooks/use-super"

const STATUS_STYLE: Record<Franchise["status"], string> = {
  live: "bg-[#5a9e5a]/15 text-[#3f7e47]",
  draft: "bg-[#d4a843]/15 text-[#8a6a1f]",
  suspended: "bg-black/[0.08] text-[#5f6268]",
}

function countryName(code: string) {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code
  } catch {
    return code
  }
}

export default function FranchisesPage() {
  const { data: franchises = [], isLoading } = useFranchises()

  return (
    <DashboardPage maxWidth="wide">
      <DashboardHeader
        title="Franchises"
        subtitle="Every branch, its setup and whether it's ready to take bookings"
        actions={
          <Link href="/dashboard/admin/franchises/new">
            <Button size="sm" style={{ background: "#c96c83", border: "none", color: "#fff" }}>
              <Plus aria-hidden className="size-4" /> New franchise
            </Button>
          </Link>
        }
      />
      <SuperOnly>
        {isLoading ? (
          <DashboardPanel><p className="text-sm text-[#5f6268]">Loading franchises…</p></DashboardPanel>
        ) : franchises.length === 0 ? (
          <EmptyState icon={MapPin} title="No franchises yet" description="Create the first branch to get started." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {franchises.map((f) => {
              const ready = Object.values(f.readiness).filter(Boolean).length
              const total = Object.keys(f.readiness).length
              return (
                <Link key={f.id} href={`/dashboard/admin/franchises/view?id=${f.id}`} className="block border border-black/10 bg-white p-4 hover:border-[#c96c83]">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-base font-extrabold text-[#101217]">{f.name}</p>
                    <span className={`shrink-0 px-2 py-0.5 text-xs font-bold uppercase tracking-wide ${STATUS_STYLE[f.status]}`}>{f.status}</span>
                  </div>
                  <p className="mt-1 text-sm text-[#5f6268]">
                    {countryName(f.country_code)} · {f.currency} · {f.time_zone.replace(/_/g, " ")}
                    {f.is_default ? " · default" : ""}
                  </p>
                  <p className="mt-3 text-xs font-semibold text-[#5f6268]">
                    {f.admins.length} admin{f.admins.length === 1 ? "" : "s"} · ready {ready}/{total}
                  </p>
                </Link>
              )
            })}
          </div>
        )}
      </SuperOnly>
    </DashboardPage>
  )
}
