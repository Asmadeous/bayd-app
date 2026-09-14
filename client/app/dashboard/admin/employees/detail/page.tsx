"use client"

import { useSearchParams } from "next/navigation"

import { EmployeeKpiDetail } from "@/features/admin/components/employee-kpi-detail"

// Per-employee KPI detail. The id is a query param (?id=) rather than a path
// segment, so this is a plain static page that works under output: export (a
// dynamic [id] segment can't static-export without build-time params). Read the
// id client-side.
export default function AdminEmployeeKpiPage() {
  const id = useSearchParams().get("id") ?? ""
  if (!id) return null
  return <EmployeeKpiDetail id={id} />
}
