"use client"

import { Suspense } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"

import { BookingFlow, type SavedAddress } from "@/app/book/page"
import api from "@/lib/api"
import { useAuthStore } from "@/lib/stores/auth-store"
import { useConfirm } from "@/lib/app-ui/app-ui-provider"
import { appScreenClass } from "../app-theme"
import { cn } from "@/lib/utils"
import { BubbleLoader } from "@/components/bubble-loader"
import { GuestServices } from "./guest-services"

// The app's Book screen renders the EXACT same BookingFlow the website /book and the
// customer dashboard use (in dashboardMode, so it prefills the signed-in user +
// their saved address). One component => the app booking is a spitting image of
// the site, with every field: coverage check, client type, group size, apartment
// + buzzer, province, add-ons, tip, gift card, recurring - nothing stripped.
export default function BookScreen() {
  const { isAuthenticated } = useAuthStore()
  const router = useRouter()
  const confirm = useConfirm()
  // Signed out (iOS keeps the app open): services and prices are browsable;
  // booking itself is an account feature.
  async function signInToBook() {
    const ok = await confirm({
      title: "Sign in to book",
      message: "Sign in or create an account to choose a time and book your visit.",
      confirmLabel: "Sign in",
    })
    if (ok) router.push("/app/signin")
  }
  const { data: addresses = [], isLoading } = useQuery<SavedAddress[]>({
    queryKey: ["addresses"],
    queryFn: () => api.get<SavedAddress[]>("/addresses").then((r) => r.data),
    enabled: isAuthenticated,
  })
  const initialAddress =
    addresses.find((a) => a.default || a.is_default) ?? addresses[0] ?? null

  if (!isAuthenticated) return <GuestServices onBook={signInToBook} />

  if (isLoading) {
    return (
      <div className={appScreenClass}>
        <BubbleLoader className="pt-24" label="Preparing your booking" />
      </div>
    )
  }

  return (
    <div className={cn(appScreenClass, "pb-0")}>
      {/* Top padding clears the status bar; BookingFlow renders its own content.
          It calls useSearchParams() - needs a Suspense boundary or the static
          export build fails. */}
      <div className="px-4 pt-[calc(1.25rem+var(--top-inset))]">
        <Suspense>
          <BookingFlow dashboardMode inApp initialAddress={initialAddress} />
        </Suspense>
      </div>
    </div>
  )
}
