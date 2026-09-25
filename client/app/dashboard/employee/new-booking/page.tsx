"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"

import { NewBookingForm } from "@/components/dashboard/new-booking-form"

export default function StaffNewBookingPage() {
  return (
    <Suspense>
      <StaffNewBooking />
    </Suspense>
  )
}

// ?date=YYYY-MM-DD&time=HH:MM pre-fill from a clicked calendar slot.
function StaffNewBooking() {
  const params = useSearchParams()
  return (
    <NewBookingForm
      mode="staff"
      initialDate={params.get("date") ?? undefined}
      initialTime={params.get("time") ?? undefined}
    />
  )
}
