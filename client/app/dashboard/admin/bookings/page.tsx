"use client"

import { useState } from "react"
import Link from "next/link"
import { CalendarDays, List, Plus } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"

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
import { Button } from "@/components/ui/button"
import { useAdminBookings } from "@/lib/hooks/use-admin"
import { AdminBookingActions } from "@/components/dashboard/admin-booking-actions"
import { AdminBookingCalendar } from "@/components/dashboard/role-booking-calendars"
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
  "missed",
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
  const { data, isLoading } = useAdminBookings({
    status: view === "list" && filter !== "all" ? filter : undefined,
    page,
  })

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

  return (
    <DashboardPage maxWidth="wide">
      <div data-tour="bookings-header">
        <DashboardHeader
          title="Bookings"
          subtitle="Manage company appointments by list or calendar."
          actions={
            <Link href="/dashboard/admin/bookings/new">
              <Button size="sm" className="border-none bg-[#c96c83] font-bold text-white hover:bg-[#c96c83]/90">
                <Plus aria-hidden className="size-4" /> New booking
              </Button>
            </Link>
          }
        />
      </div>


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
        {view === "calendar" ? (
          <AdminBookingCalendar />
        ) : isLoading ? (
          <DashboardPanel>
            <p className="text-sm text-[#5f6268]">Loading bookings...</p>
          </DashboardPanel>
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
                actions={<AdminBookingActions booking={booking} />}
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
