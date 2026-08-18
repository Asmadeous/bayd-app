"use client"

import { useState } from "react"

import { AppCalendar } from "@/components/dashboard/app-calendar"
import { BookingCard } from "@/components/dashboard/booking-card"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardPage } from "@/components/dashboard/dashboard-page"
import { DashboardPanel } from "@/components/dashboard/dashboard-panel"
import { TutorialButton } from "@/components/dashboard/tutorial-button"
import { useAdminBookings } from "@/lib/hooks/use-admin"
import { adminCalendarSteps } from "@/lib/tours/admin-calendar-tour"
import type { Booking } from "@/lib/hooks/use-bookings"

export default function AdminCalendarPage() {
  const { data, isLoading } = useAdminBookings({ page: 1 })
  const bookings = data?.data ?? []
  const [selectedDay, setSelectedDay] = useState<{ date: Date; bookings: Booking[] } | null>(null)

  return (
    <DashboardPage maxWidth="wide">
      <div data-tour="calendar-header">
        <DashboardHeader title="Company Calendar" subtitle="All bookings across the business." />
      </div>

      {isLoading ? (
        <DashboardPanel>
          <p className="text-sm text-[#5f6268]">Loading calendar...</p>
        </DashboardPanel>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_26rem]">
          <div data-tour="calendar-grid">
            <AppCalendar
              bookings={bookings}
              onSelectDay={(date, bks) => setSelectedDay({ date, bookings: bks })}
            />
          </div>

          <DashboardPanel data-tour="calendar-day-panel">
            <h2 className="text-base font-extrabold text-[#101217]">
              {selectedDay
                ? selectedDay.date.toLocaleDateString("en-CA", {
                    day: "numeric",
                    month: "long",
                    weekday: "long",
                  })
                : `All bookings (${bookings.length} shown)`}
            </h2>
            <div className="mt-4 space-y-3">
              {selectedDay ? (
                selectedDay.bookings.length === 0 ? (
                  <div className="border border-black/8 bg-[#fbfaf7] px-5 py-8 text-center text-sm text-[#5f6268]">
                    No bookings on this day.
                  </div>
                ) : (
                  selectedDay.bookings.map((booking) => (
                    <BookingCard booking={booking} key={booking.id} />
                  ))
                )
              ) : (
                bookings.slice(0, 8).map((booking) => (
                  <BookingCard booking={booking} key={booking.id} />
                ))
              )}
            </div>
          </DashboardPanel>
        </div>
      )}

      <TutorialButton steps={adminCalendarSteps} pageKey="admin-calendar" />
    </DashboardPage>
  )
}
