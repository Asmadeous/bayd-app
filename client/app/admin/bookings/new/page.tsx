"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"

import { NewBookingForm } from "@/components/dashboard/new-booking-form"
import { AdminHeader } from "../../admin-header"
import { adminScreenClass, mutedClass } from "../../admin-theme"

export default function AdminNewBookingScreen() {
  // useSearchParams needs a Suspense boundary for the static export.
  return (
    <Suspense>
      <NewBooking />
    </Suspense>
  )
}

// The web's admin booking form. ?date=&time=&employee_id= pre-fill from a
// tapped calendar slot.
function NewBooking() {
  const params = useSearchParams()
  const employeeId = Number(params.get("employee_id"))
  return (
    <div className={adminScreenClass}>
      <AdminHeader back title="New booking" />
      <p className={`px-5 pb-3 text-sm ${mutedClass}`}>
        Book a client in for any technician. This goes straight onto their schedule.
      </p>
      <div className="px-5">
        <NewBookingForm
          mode="admin"
          embedded
          backHref="/admin/bookings"
          initialDate={params.get("date") ?? undefined}
          initialTime={params.get("time") ?? undefined}
          initialEmployeeId={employeeId > 0 ? employeeId : undefined}
        />
      </div>
    </div>
  )
}
