"use client"

import { Suspense } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft } from "lucide-react"

import { BookingFlow } from "@/app/book/page"
import { BubbleLoader } from "@/components/bubble-loader"
import { useEmployeeProfile } from "@/lib/hooks/use-employee"
import { staffScreenClass } from "../../staff-theme"
import { cn } from "@/lib/utils"

// Staff-created booking: the same step-by-step flow customers use (service list,
// add-ons, availability, summary), in staff mode. The client is looked up or
// typed in, and the booking goes straight onto this tech's schedule.
// ?date=YYYY-MM-DD pre-fills the day. BookingFlow reads search params, which
// needs a Suspense boundary or the static app export fails.
export default function StaffNewBookingScreen() {
  const router = useRouter()
  const { data: profile, isLoading } = useEmployeeProfile()

  return (
    <div className={cn(staffScreenClass, "pb-0")}>
      <div className="px-4 pt-[calc(1rem+var(--top-inset))]">
        {isLoading || !profile ? (
          // The flow draws its own back button; while it loads, this is the way out.
          <>
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Back"
              className="mb-2 grid size-10 place-items-center rounded-full bg-white shadow-sm"
            >
              <ChevronLeft className="size-5" aria-hidden />
            </button>
            <BubbleLoader className="pt-24" label="Preparing the booking form" />
          </>
        ) : (
          <Suspense>
            <BookingFlow dashboardMode staffBooking={{ employeeId: profile.id }} />
          </Suspense>
        )}
      </div>
    </div>
  )
}
