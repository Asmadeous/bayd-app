"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"

import { FranchiseSections, FranchiseStatusButton, franchiseSubtitle } from "@/components/dashboard/franchise-sections"
import { useFranchise } from "@/lib/hooks/use-super"
import { AdminHeader } from "../../admin-header"
import { adminScreenClass, displayClass, mutedClass } from "../../admin-theme"
import { SuperGate } from "../../super-gate"

export default function AdminFranchiseScreen() {
  // useSearchParams needs a Suspense boundary for the static export.
  return (
    <SuperGate title="Franchise">
      <Suspense>
        <Franchise />
      </Suspense>
    </SuperGate>
  )
}

// One franchise: go live or suspend, then the web page's own sections
// (readiness, setup, Square keys, service menu, admins, legal pages).
function Franchise() {
  const id = Number(useSearchParams().get("id"))
  const { data: franchise, isLoading } = useFranchise(id)

  return (
    <div className={adminScreenClass}>
      <AdminHeader back title="Franchise" />
      {isLoading || !franchise ? (
        <p className={`px-5 text-sm ${mutedClass}`}>{isLoading ? "Loading…" : "Franchise not found."}</p>
      ) : (
        <div className="space-y-4 px-5">
          <div>
            <p className={`${displayClass} text-2xl`}>{franchise.name}</p>
            <p className={`text-sm ${mutedClass}`}>{franchiseSubtitle(franchise)}</p>
            <FranchiseStatusButton franchise={franchise} className="mt-3 h-11 w-full" />
          </div>
          <div className="space-y-4">
            <FranchiseSections franchise={franchise} />
          </div>
        </div>
      )}
    </div>
  )
}
