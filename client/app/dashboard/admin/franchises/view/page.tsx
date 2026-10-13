"use client"

import { Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ChevronLeft } from "lucide-react"

import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardPage } from "@/components/dashboard/dashboard-page"
import { DashboardPanel } from "@/components/dashboard/dashboard-panel"
import { FranchiseSections, FranchiseStatusButton, franchiseSubtitle } from "@/components/dashboard/franchise-sections"
import { SuperOnly } from "@/components/dashboard/super-only"
import { useFranchise } from "@/lib/hooks/use-super"

export default function FranchiseDetailPage() {
  // useSearchParams needs a Suspense boundary for the static export.
  return (
    <SuperOnly>
      <Suspense>
        <FranchiseDetail />
      </Suspense>
    </SuperOnly>
  )
}

function FranchiseDetail() {
  const id = Number(useSearchParams().get("id"))
  const { data: franchise, isLoading } = useFranchise(id)

  return (
    <DashboardPage>
      <Link href="/dashboard/admin/franchises" className="inline-flex items-center gap-1 text-sm font-semibold text-[#5f6268] hover:text-[#101217]">
        <ChevronLeft aria-hidden className="size-4" /> All franchises
      </Link>
      {isLoading || !franchise ? (
        <DashboardPanel><p className="text-sm text-[#5f6268]">{isLoading ? "Loading…" : "Franchise not found."}</p></DashboardPanel>
      ) : (
        <>
          <DashboardHeader title={franchise.name} subtitle={franchiseSubtitle(franchise)} actions={<FranchiseStatusButton franchise={franchise} />} />
          <FranchiseSections franchise={franchise} />
        </>
      )}
    </DashboardPage>
  )
}
