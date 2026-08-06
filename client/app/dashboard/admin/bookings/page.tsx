"use client"

import { useState } from "react"
import { CalendarDays, List } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"

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
import { Button } from "@/components/ui/button"
import { useAdminBookings, useUpdateBooking } from "@/lib/hooks/use-admin"
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

  function renderBookingActions(booking: Booking) {
    return (
      <>
        {booking.status === "confirmed" && (
          <Button
            disabled={updateMutation.isPending}
            onClick={() =>
              updateMutation.mutate({ id: booking.id, status: "in_progress" })
            }
            size="xs"
            style={{ background: "#d4a843", border: "none", color: "#fff" }}
          >
            Start
          </Button>
        )}
        {booking.status === "in_progress" && (
          <Button
            disabled={updateMutation.isPending}
            onClick={() =>
              updateMutation.mutate({ id: booking.id, status: "completed" })
            }
            size="xs"
            style={{ background: "#5a9e5a", border: "none", color: "#fff" }}
          >
            Complete
          </Button>
        )}
        {(booking.status === "pending" || booking.status === "confirmed") && (
          <Button
            disabled={updateMutation.isPending}
            onClick={() =>
              updateMutation.mutate({ id: booking.id, status: "cancelled" })
            }
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
      <DashboardHeader title="Bookings" subtitle="Manage company appointments by list or calendar." />

      <DashboardToolbar>
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
        <DashboardToolbar>
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

      {view === "list" && pagination && pagination.total_pages > 1 ? (
        <DashboardToolbar className="justify-end">
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
    </DashboardPage>
  )
}
