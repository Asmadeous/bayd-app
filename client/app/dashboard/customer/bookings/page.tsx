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
import { AppCalendar } from "@/components/dashboard/app-calendar"
import { BookingCard } from "@/components/dashboard/booking-card"
import { ReviewDialog } from "@/components/dashboard/review-dialog"
import { StatusBadgeFor } from "@/components/dashboard/status-badge"
import { TutorialButton } from "@/components/dashboard/tutorial-button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { useBookings, useCancelBooking, type Booking } from "@/lib/hooks/use-bookings"
import { RescheduleDialog } from "@/components/dashboard/reschedule-dialog"
import { MessageTechButton } from "@/components/dashboard/message-tech-button"
import { MeetingButton } from "@/components/dashboard/meeting-button"
import { TechEta } from "@/components/dashboard/tech-eta"
import { customerBookingsSteps } from "@/lib/tours/customer-bookings-tour"

// Only subscribe to live tracking for a booking happening today.
function isToday(iso: string): boolean {
  const d = new Date(iso)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}

// The service address coords for the map's destination pin, or null if unknown.
function destinationOf(b: Booking): { lat: number; lng: number } | null {
  if (!b.service_latitude || !b.service_longitude) return null
  return { lat: Number(b.service_latitude), lng: Number(b.service_longitude) }
}

const ALL_STATUSES: Booking["status"][] = [
  "pending", "confirmed", "in_progress", "completed", "cancelled", "no_show", "missed",
]

type BookingsView = "list" | "calendar"

export default function CustomerBookingsPage() {
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState<Booking["status"] | "all">("all")
  const [view, setView] = useState<BookingsView>(
    searchParams.get("view") === "calendar" ? "calendar" : "list",
  )
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [dayBookings, setDayBookings] = useState<Booking[]>([])
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null)
  const { data, isError, isLoading } = useBookings(page)
  const cancelMutation = useCancelBooking()

  const bookings = data?.data ?? []
  const pagination = data?.pagination

  const filtered =
    filter === "all" ? bookings : bookings.filter((b) => b.status === filter)

  const dateLabel = selectedDate?.toLocaleDateString("en-CA", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })

  function handleViewChange(nextView: BookingsView) {
    setView(nextView)
    if (nextView === "calendar") {
      setPage(1)
    }
    router.replace(
      nextView === "calendar"
        ? "/dashboard/customer/bookings?view=calendar"
        : "/dashboard/customer/bookings",
      { scroll: false },
    )
  }

  function handleDaySelect(date: Date, selectedBookings: Booking[]) {
    setSelectedDate(date)
    setDayBookings(selectedBookings)
  }

  function cancelBooking(id: number) {
    cancelMutation.mutate(
      { id },
      {
        onSuccess: () => toast({ title: "Booking cancelled", variant: "success" }),
        onError: (error) => toast({
          title: "Booking not cancelled",
          description: getApiErrorMessage(error, "Could not cancel this booking."),
          variant: "error",
        }),
      },
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
          {filtered.length} bookings
        </ToolbarSection>
      </DashboardToolbar>

      {view === "list" ? (
        <DashboardToolbar data-tour="customer-bookings-filters">
          <ToolbarSection>
            <SegmentedControl>
              {(["all", ...ALL_STATUSES] as const).map((status) => (
                <SegmentButton
                  active={filter === status}
                  key={status}
                  onClick={() => setFilter(status)}
                >
                  {status.replace("_", " ")}
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
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <AppCalendar bookings={bookings} onSelectDay={handleDaySelect} />

          <DashboardPanel className="space-y-3">
            <h2 className="text-sm font-semibold text-[#101217]">
              {selectedDate ? dateLabel : "Select a day to see appointments"}
            </h2>
            {selectedDate && dayBookings.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="No bookings on this day"
                description="Select another date to review scheduled appointments."
              />
            ) : null}
            {dayBookings.map((b) => (
              <BookingCard key={b.id} booking={b} />
            ))}
          </DashboardPanel>
        </div>
      ) : (
        <>
          {filtered.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="No bookings found"
              description="Try another filter or book a new appointment."
            />
          ) : (
            <div className="space-y-3">
              {filtered.map((b) => (
                <div key={b.id}>
                <BookingCard
                  booking={b}
                  actions={
                    b.status === "pending" || b.status === "confirmed" ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <MessageTechButton techUserId={b.employee_profile?.user?.id} />
                        <MeetingButton booking={b} />
                        <RescheduleDialog booking={b} />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                              size="xs"
                              disabled={cancelMutation.isPending}
                            >
                              Cancel
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Cancel booking?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will cancel {b.service?.name ?? "this appointment"}. You may need to book again if you change your mind.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Keep booking</AlertDialogCancel>
                              <AlertDialogAction onClick={() => cancelBooking(b.id)}>
                                Cancel booking
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    ) : b.status === "completed" ? (
                      b.has_review ? (
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
                    ) : null
                  }
                />
                {b.status === "confirmed" && (
                  <TechEta
                    bookingId={b.id}
                    enabled={isToday(b.starts_at)}
                    destination={destinationOf(b)}
                  />
                )}
                </div>
              ))}
            </div>
          )}

          {pagination && pagination.total_pages > 1 && (
            <DashboardToolbar className="justify-end">
              <ToolbarSection className="ml-auto">
              <Button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                size="sm"
                variant="outline"
              >
                Prev
              </Button>
              <span className="px-2 text-sm font-semibold text-[#5f6268]">
                {page} / {pagination.total_pages}
              </span>
              <Button
                disabled={!pagination.next_page}
                onClick={() => setPage((p) => p + 1)}
                size="sm"
                variant="outline"
              >
                Next
              </Button>
              </ToolbarSection>
            </DashboardToolbar>
          )}
        </>
      )}
      </div>

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

function getApiErrorMessage(error: unknown, fallback: string) {
  const data = (error as { response?: { data?: { error?: string; errors?: string[] } } })?.response?.data
  return data?.error ?? data?.errors?.join(", ") ?? fallback
}
