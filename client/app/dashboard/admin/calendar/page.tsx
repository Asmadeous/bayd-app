"use client"

import { useState } from "react"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { AppCalendar } from "@/components/dashboard/app-calendar"
import { BookingCard } from "@/components/dashboard/booking-card"
import { useAdminBookings } from "@/lib/hooks/use-admin"
import type { Booking } from "@/lib/hooks/use-bookings"

export default function AdminCalendarPage() {
  const { data, isLoading } = useAdminBookings({ page: 1 })
  const bookings = data?.data ?? []
  const [selectedDay, setSelectedDay] = useState<{ date: Date; bookings: Booking[] } | null>(null)

  return (
    <div className="space-y-8">
      <DashboardHeader
        title="Company Calendar"
        subtitle="All bookings across the business"
      />

      {isLoading ? (
        <div className="text-sm text-[#5f6268]">Loading…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AppCalendar
            bookings={bookings}
            onSelectDay={(date, bks) => setSelectedDay({ date, bookings: bks })}
          />

          <div className="space-y-3">
            <h2 className="font-semibold text-[#101217] text-sm">
              {selectedDay
                ? selectedDay.date.toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric" })
                : `All bookings (${bookings.length} shown)`}
            </h2>
            {selectedDay ? (
              selectedDay.bookings.length === 0 ? (
                <div className="rounded-xl border border-black/8 bg-white px-5 py-8 text-center text-sm text-[#5f6268]">
                  No bookings on this day.
                </div>
              ) : (
                selectedDay.bookings.map((b) => <BookingCard key={b.id} booking={b} />)
              )
            ) : (
              bookings.slice(0, 8).map((b) => <BookingCard key={b.id} booking={b} />)
            )}
          </div>
        </div>
      )}
    </div>
  )
}
