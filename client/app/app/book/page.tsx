"use client"

import { Suspense } from "react"
import { useQuery } from "@tanstack/react-query"

import { BookingFlow, type SavedAddress } from "@/app/book/page"
import api from "@/lib/api"
import { useAuthStore } from "@/lib/stores/auth-store"
import { appScreenClass } from "../app-theme"
import { BubbleLoader } from "@/components/bubble-loader"

// The app's Book tab renders the EXACT same BookingFlow the website /book and the
// customer dashboard use (in dashboardMode, so it prefills the signed-in user +
// their saved address). One component => the app booking is a spitting image of
// the site, with every field: coverage check, client type, group size, apartment
// + buzzer, province, add-ons, tip, gift card, recurring - nothing stripped.
export default function BookScreen() {
  const { isAuthenticated } = useAuthStore()
  const { data: addresses = [], isLoading } = useQuery<SavedAddress[]>({
    queryKey: ["addresses"],
    queryFn: () => api.get<SavedAddress[]>("/addresses").then((r) => r.data),
    enabled: isAuthenticated,
  })
  const initialAddress =
    addresses.find((a) => a.default || a.is_default) ?? addresses[0] ?? null

  if (isLoading) {
    return (
      <div className={appScreenClass}>
        <BubbleLoader className="pt-24" label="Preparing your booking" />
      </div>
    )
  }

  return (
    <div className={appScreenClass}>
      {/* Top padding clears the status bar; BookingFlow renders its own content.
          It calls useSearchParams() - needs a Suspense boundary or the static
          export build fails. */}
      <div className="px-4 pt-[calc(1.25rem+env(safe-area-inset-top))]">
        <Suspense>
          <BookingFlow dashboardMode initialAddress={initialAddress} />
        </Suspense>
      </div>
    </div>
  )
}
