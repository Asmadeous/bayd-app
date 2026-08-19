"use client"

import { useState } from "react"
import { CalendarDays, List } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"

import { useToast } from "@/components/bayd-toast-provider"
import { AppCalendar } from "@/components/dashboard/app-calendar"
import { BookingCard } from "@/components/dashboard/booking-card"
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
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useAdminBookings, useUpdateBooking } from "@/lib/hooks/use-admin"
import { ReassignControl } from "@/components/dashboard/reassign-control"
import { RescheduleDialog } from "@/components/dashboard/reschedule-dialog"
import { adminBookingsSteps } from "@/lib/tours/admin-bookings-tour"
import type { Booking } from "@/lib/hooks/use-bookings"

const STATUSES: Array<Booking["status"] | "all"> = [
  "all",
  "pending",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
  "no_show",
]

type BookingsView = "list" | "calendar"

export default function AdminBookingsPage() {
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState<Booking["status"] | "all">("all")
  const [view, setView] = useState<BookingsView>(
    searchParams.get("view") === "calendar" ? "calendar" : "list",
  )
  const [selectedDay, setSelectedDay] = useState<{
    date: Date
    bookings: Booking[]
  } | null>(null)
  const [cancellingBooking, setCancellingBooking] = useState<Booking | null>(null)
  const [cancellationReason, setCancellationReason] = useState("")
  const [cancellationError, setCancellationError] = useState<string | null>(null)
  const { data, isLoading } = useAdminBookings({
    status: view === "list" && filter !== "all" ? filter : undefined,
    page,
  })
  const updateMutation = useUpdateBooking()

  const bookings = data?.data ?? []
  const pagination = data?.pagination

  function selectFilter(status: Booking["status"] | "all") {
    setFilter(status)
    setPage(1)
  }

  function selectView(nextView: BookingsView) {
    setView(nextView)
    setPage(1)
    router.replace(
      nextView === "calendar"
        ? "/dashboard/admin/bookings?view=calendar"
        : "/dashboard/admin/bookings",
      { scroll: false },
    )
  }

  function updateBookingStatus(booking: Booking, status: Booking["status"], cancellation_reason?: string) {
    updateMutation.mutate(
      { id: booking.id, status, cancellation_reason },
      {
        onSuccess: () => {
          const label = status.replace("_", " ")
          toast({ title: "Booking updated", description: `Booking marked ${label}.`, variant: "success" })
          if (status === "cancelled") {
            setCancellingBooking(null)
            setCancellationReason("")
            setCancellationError(null)
          }
        },
        onError: (error: unknown) => {
          const message = getApiErrorMessage(error, "Could not update this booking.")
          if (status === "cancelled") setCancellationError(message)
          toast({ title: "Booking not updated", description: message, variant: "error" })
        },
      }
    )
  }

  function openCancelDialog(booking: Booking) {
    setCancellingBooking(booking)
    setCancellationReason("")
    setCancellationError(null)
  }

  function closeCancelDialog() {
    setCancellingBooking(null)
    setCancellationReason("")
    setCancellationError(null)
  }

  function confirmCancellation() {
    if (!cancellingBooking) return
    updateBookingStatus(cancellingBooking, "cancelled", cancellationReason.trim())
  }

  function renderBookingActions(booking: Booking) {
    return (
      <>
        {(booking.status === "pending" ||
          booking.status === "confirmed" ||
          booking.status === "in_progress") && (
          <ReassignControl bookingId={booking.id} />
        )}
        {(booking.status === "pending" || booking.status === "confirmed") && (
          <RescheduleDialog booking={booking} admin />
        )}
        {booking.status === "confirmed" && (
          <Button
            disabled={updateMutation.isPending}
            onClick={() => updateBookingStatus(booking, "in_progress")}
            size="xs"
            style={{ background: "#d4a843", border: "none", color: "#fff" }}
          >
            Start
          </Button>
        )}
        {booking.status === "in_progress" && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                disabled={updateMutation.isPending}
                size="xs"
                style={{ background: "#5a9e5a", border: "none", color: "#fff" }}
              >
                Complete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Complete booking?</AlertDialogTitle>
                <AlertDialogDescription>
                  This marks the appointment complete and can trigger loyalty, review, and rebooking follow-up workflows.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => updateBookingStatus(booking, "completed")}>
                  Complete booking
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        {(booking.status === "pending" || booking.status === "confirmed") && (
          <Button
            disabled={updateMutation.isPending}
            onClick={() => openCancelDialog(booking)}
            size="xs"
            variant="destructive"
          >
            Cancel
          </Button>
        )}
      </>
    )
  }

  const selectedDateLabel = selectedDay?.date.toLocaleDateString("en-CA", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })

  return (
    <DashboardPage maxWidth="wide">
      <div data-tour="bookings-header">
        <DashboardHeader title="Bookings" subtitle="Manage company appointments by list or calendar." />
      </div>

      <Dialog open={cancellingBooking !== null} onOpenChange={(open) => { if (!open) closeCancelDialog() }}>
        <DialogContent className="max-w-lg">
          <DialogHeader className="pr-14">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a36f4d]">
              Booking status
            </p>
            <DialogTitle>Cancel booking?</DialogTitle>
            <DialogDescription>
              Add the reason for cancelling so the booking history is clear for staff and customer follow-up.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            {cancellationError ? (
              <div
                aria-live="polite"
                className="mb-4 border border-[#b75c68]/25 bg-[#fff5f6] px-4 py-3 text-sm font-semibold text-[#8f3f4b]"
              >
                {cancellationError}
              </div>
            ) : null}
            <label>
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-[#6b6f76]">
                Cancellation reason
              </span>
              <textarea
                className="min-h-28 w-full border border-black/15 bg-white px-3 py-2 text-sm text-[#101217] outline-none transition focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20"
                onChange={(event) => {
                  setCancellationReason(event.target.value)
                  setCancellationError(null)
                }}
                placeholder="Customer requested cancellation, staff unavailable, duplicate booking..."
                value={cancellationReason}
              />
            </label>
          </DialogBody>
          <DialogFooter>
            <Button
              disabled={updateMutation.isPending}
              onClick={confirmCancellation}
              size="sm"
              variant="destructive"
            >
              {updateMutation.isPending ? "Cancelling..." : "Cancel booking"}
            </Button>
            <Button onClick={closeCancelDialog} size="sm" variant="ghost">
              Keep booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DashboardToolbar data-tour="bookings-view-toggle">
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
                  onClick={() => selectView(item.value)}
                >
                  <Icon aria-hidden="true" className="size-4" />
                  {item.label}
                </SegmentButton>
              )
            })}
          </SegmentedControl>
        </ToolbarSection>
        <ToolbarSection className="text-sm font-semibold text-[#5f6268]">
          {pagination?.total_count ?? bookings.length} bookings
        </ToolbarSection>
      </DashboardToolbar>

      {view === "list" ? (
        <DashboardToolbar data-tour="bookings-status-filter">
          <ToolbarSection>
            <SegmentedControl>
              {STATUSES.map((status) => (
                <SegmentButton
                  active={filter === status}
                  key={status}
                  onClick={() => selectFilter(status)}
                >
                  {status.replace("_", " ")}
                </SegmentButton>
              ))}
            </SegmentedControl>
          </ToolbarSection>
        </DashboardToolbar>
      ) : null}

      <div data-tour="bookings-content">
        {isLoading ? (
          <DashboardPanel>
            <p className="text-sm text-[#5f6268]">Loading bookings...</p>
          </DashboardPanel>
        ) : view === "calendar" ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <AppCalendar
              bookings={bookings}
              onSelectDay={(date, dayBookings) =>
                setSelectedDay({ date, bookings: dayBookings })
              }
            />

            <DashboardPanel className="space-y-3">
              <h2 className="text-sm font-semibold text-[#101217]">
                {selectedDay
                  ? selectedDateLabel
                  : `All bookings (${bookings.length} shown)`}
              </h2>
              {selectedDay ? (
                selectedDay.bookings.length === 0 ? (
                  <EmptyState
                    icon={CalendarDays}
                    title="No bookings on this day"
                    description="Select another date to review scheduled appointments."
                  />
                ) : (
                  selectedDay.bookings.map((booking) => (
                    <BookingCard
                      actions={renderBookingActions(booking)}
                      booking={booking}
                      key={booking.id}
                    />
                  ))
                )
              ) : (
                bookings.slice(0, 8).map((booking) => (
                  <BookingCard
                    actions={renderBookingActions(booking)}
                    booking={booking}
                    key={booking.id}
                  />
                ))
              )}
            </DashboardPanel>
          </div>
        ) : bookings.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No bookings found"
            description="Try another status filter or check back when new customer requests are submitted."
          />
        ) : (
          <div className="space-y-3">
            {bookings.map((booking) => (
              <BookingCard
                actions={renderBookingActions(booking)}
                booking={booking}
                key={booking.id}
              />
            ))}
          </div>
        )}
      </div>

      {view === "list" && pagination && pagination.total_pages > 1 ? (
        <DashboardToolbar className="justify-end" data-tour="bookings-pagination">
          <ToolbarSection className="ml-auto">
            <Button
              disabled={page <= 1}
              onClick={() => setPage((currentPage) => currentPage - 1)}
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
              onClick={() => setPage((currentPage) => currentPage + 1)}
              size="sm"
              variant="outline"
            >
              Next
            </Button>
          </ToolbarSection>
        </DashboardToolbar>
      ) : null}

      <TutorialButton steps={adminBookingsSteps} pageKey="admin-bookings" />
    </DashboardPage>
  )
}

function getApiErrorMessage(error: unknown, fallback: string) {
  const data = (error as { response?: { data?: { error?: string; errors?: string[] } } })?.response?.data
  return data?.error ?? data?.errors?.join(", ") ?? fallback
}
