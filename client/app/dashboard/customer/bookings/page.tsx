"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CalendarDays, List } from "lucide-react"

import { useToast } from "@/components/bayd-toast-provider"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardPage } from "@/components/dashboard/dashboard-page"
import { DashboardPanel } from "@/components/dashboard/dashboard-panel"
import {
  DashboardToolbar,
  SegmentedControl,
  SegmentButton,
  ToolbarSection,
} from "@/components/dashboard/dashboard-toolbar"
import { EmptyState } from "@/components/dashboard/empty-state"
import { CustomerBookingCalendar } from "@/components/dashboard/role-booking-calendars"
import { BookingCard } from "@/components/dashboard/booking-card"
import { ReviewDialog } from "@/components/dashboard/review-dialog"
import { StatusBadgeFor } from "@/components/dashboard/status-badge"
import { TutorialButton } from "@/components/dashboard/tutorial-button"
import { Button } from "@/components/ui/button"
import { useBookingsList, type Booking } from "@/lib/hooks/use-bookings"
import { BookingDetailsSheet } from "@/components/dashboard/booking-details-sheet"
import { CancelBookingButton } from "@/components/dashboard/cancel-booking-button"
import { RescheduleDialog } from "@/components/dashboard/reschedule-dialog"
import { MessageTechButton } from "@/components/dashboard/message-tech-button"
import { MeetingButton } from "@/components/dashboard/meeting-button"
import { TechEta } from "@/components/dashboard/tech-eta"
import { useBookingAccess } from "@/lib/booking-access"
import { customerBookingsSteps } from "@/lib/tours/customer-bookings-tour"

// Only subscribe to live tracking for a booking happening today.
function isToday(iso: string): boolean {
  const d = new Date(iso)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}

// The tech's live map, from 30 minutes before the appointment (the API refuses
// tracking earlier); before that, when it will open.
function LiveTracking({ booking }: { booking: Booking }) {
  const access = useBookingAccess(booking)
  if (!access.open) {
    return <p className="mt-2 text-xs text-[#5f6268]">Live tracking of your technician opens at {access.opensLabel}.</p>
  }
  return <TechEta bookingId={booking.id} enabled destination={destinationOf(booking)} />
}

// The service address coords for the map's destination pin, or null if unknown.
function destinationOf(b: Booking): { lat: number; lng: number } | null {
  if (!b.service_latitude || !b.service_longitude) return null
  return { lat: Number(b.service_latitude), lng: Number(b.service_longitude) }
}

type BookingsTab = "upcoming" | "past"

type BookingsView = "list" | "calendar"

export default function CustomerBookingsPage() {
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<BookingsTab>(searchParams.get("tab") === "past" ? "past" : "upcoming")
  const [view, setView] = useState<BookingsView>(
    searchParams.get("view") === "calendar" ? "calendar" : "list",
  )
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null)
  const [detailsId, setDetailsId] = useState<number | null>(null)
  // Upcoming soonest first, past (history) latest first: split on the server so
  // paging can't hide an upcoming appointment behind older ones.
  const upcoming = useBookingsList("upcoming")
  const past = useBookingsList("past", { enabled: tab === "past" })
  const list = tab === "upcoming" ? upcoming : past
  const bookings = list.items
  const isLoading = list.isLoading
  const isError = upcoming.isError || past.isError
  const details = [...upcoming.items, ...past.items].find((b) => b.id === detailsId) ?? null

  function bookingActions(b: Booking) {
    if (b.status === "pending" || b.status === "confirmed") {
      return (
        <div className="flex flex-wrap items-center gap-2">
          <MessageTechButton booking={b} />
          <MeetingButton booking={b} />
          <RescheduleDialog booking={b} />
          <CancelBookingButton booking={b} />
        </div>
      )
    }
    if (b.status === "completed") {
      return b.has_review ? (
        <StatusBadgeFor status="reviewed" />
      ) : (
        <Button
          size="xs"
          onClick={() => setReviewBooking(b)}
          style={{ background: "#c96c83", border: "none", color: "#fff" }}
        >
          Leave a review
        </Button>
      )
    }
    return null
  }

  function handleViewChange(nextView: BookingsView) {
    setView(nextView)
    router.replace(
      nextView === "calendar"
        ? "/dashboard/customer/bookings?view=calendar"
        : "/dashboard/customer/bookings",
      { scroll: false },
    )
  }

  useEffect(() => {
    if (isError) {
      toast({
        title: "Bookings not loaded",
        description: "Could not load your bookings.",
        variant: "error",
      })
    }
  }, [isError, toast])

  return (
    <DashboardPage maxWidth="wide">
      <div data-tour="customer-bookings-header">
        <DashboardHeader title="Bookings" subtitle="Review appointments as a list or calendar" />
      </div>

      <DashboardToolbar data-tour="customer-bookings-view-toggle">
        <ToolbarSection>
          <SegmentedControl>
            {([
              { icon: List, label: "List", value: "list" },
              { icon: CalendarDays, label: "Calendar", value: "calendar" },
            ] as const).map((item) => {
              const Icon = item.icon

              return (
                <SegmentButton
                  active={view === item.value}
                  key={item.value}
                  onClick={() => handleViewChange(item.value)}
                >
                  <Icon aria-hidden="true" className="size-4" />
                  {item.label}
                </SegmentButton>
              )
            })}
          </SegmentedControl>
        </ToolbarSection>
        <ToolbarSection className="text-sm font-semibold text-[#5f6268]">
          {view === "list" ? `${bookings.length}${list.hasMore ? "+" : ""} ${tab === "upcoming" ? "upcoming" : "past"}` : null}
        </ToolbarSection>
      </DashboardToolbar>

      {view === "list" ? (
        <DashboardToolbar data-tour="customer-bookings-filters">
          <ToolbarSection>
            <SegmentedControl>
              {([
                { value: "upcoming", label: "Upcoming" },
                { value: "past", label: "Past & cancelled" },
              ] as const).map((item) => (
                <SegmentButton active={tab === item.value} key={item.value} onClick={() => setTab(item.value)}>
                  {item.label}
                </SegmentButton>
              ))}
            </SegmentedControl>
          </ToolbarSection>
        </DashboardToolbar>
      ) : null}

      <div data-tour="customer-bookings-content">
      {isLoading ? (
        <DashboardPanel>
          <p className="text-sm text-[#5f6268]">Loading bookings...</p>
        </DashboardPanel>
      ) : view === "calendar" ? (
        <CustomerBookingCalendar />
      ) : (
        <>
          {bookings.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title={tab === "upcoming" ? "No upcoming appointments" : "No past appointments yet"}
              description={tab === "upcoming" ? "Book an appointment and it will show here." : "Your appointment history will appear here."}
            />
          ) : (
            <div className="space-y-3">
              {bookings.map((b) => (
                <div key={b.id}>
                <BookingCard
                  booking={b}
                  actions={
                    <div className="flex flex-wrap items-center gap-2">
                      <Button size="xs" variant="outline" onClick={() => setDetailsId(b.id)}>
                        Details
                      </Button>
                      {bookingActions(b)}
                    </div>
                  }
                />
                {b.status === "confirmed" && isToday(b.starts_at) && <LiveTracking booking={b} />}
                </div>
              ))}
            </div>
          )}

          {list.hasMore ? (
            <Button className="mt-3 w-full" disabled={list.loadingMore} onClick={list.loadMore} variant="outline">
              {list.loadingMore ? "Loading..." : "Load more"}
            </Button>
          ) : null}
        </>
      )}
      </div>

      <BookingDetailsSheet
        booking={details}
        actions={details ? bookingActions(details) : null}
        onClose={() => setDetailsId(null)}
      />

      {reviewBooking && (
        <ReviewDialog
          booking={reviewBooking}
          onClose={() => setReviewBooking(null)}
        />
      )}

      <TutorialButton steps={customerBookingsSteps} pageKey="customer-bookings" />
    </DashboardPage>
  )
}
