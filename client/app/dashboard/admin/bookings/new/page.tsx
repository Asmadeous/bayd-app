"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"

import { NewBookingForm } from "@/components/dashboard/new-booking-form"

export default function AdminNewBookingPage() {
  return (
    <Suspense>
      <AdminNewBooking />
    </Suspense>
  )
}

// ?date=&time=&employee_id= pre-fill from a clicked calendar slot.
function AdminNewBooking() {
  const params = useSearchParams()
  const employeeId = Number(params.get("employee_id"))
  return (
    <NewBookingForm
      mode="admin"
      initialDate={params.get("date") ?? undefined}
      initialTime={params.get("time") ?? undefined}
      initialEmployeeId={employeeId > 0 ? employeeId : undefined}
    />
  )
}
