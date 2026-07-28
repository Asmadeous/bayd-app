"use client"

import { useState } from "react"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { AppCalendar } from "@/components/dashboard/app-calendar"
import { BookingCard } from "@/components/dashboard/booking-card"
import { useBookings } from "@/lib/hooks/use-bookings"
import type { Booking } from "@/lib/hooks/use-bookings"

export default function CustomerCalendarPage() {
  const { data, isLoading } = useBookings(1)
  const bookings = data?.data ?? []
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [dayBookings, setDayBookings] = useState<Booking[]>([])

  function handleDaySelect(date: Date, bks: Booking[]) {
    setSelectedDate(date)
    setDayBookings(bks)
  }

  const dateLabel = selectedDate?.toLocaleDateString("en-CA", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })

  return (
    <div className="space-y-8">
      <DashboardHeader title="My Calendar" subtitle="Your booking schedule at a glance" />

      {isLoading ? (
        <div className="text-sm text-[#5f6268]">Loading…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AppCalendar bookings={bookings} onSelectDay={handleDaySelect} />

          <div className="space-y-3">
            <h2 className="font-semibold text-[#101217] text-sm">
              {selectedDate ? dateLabel : "Select a day to see appointments"}
            </h2>
            {selectedDate && dayBookings.length === 0 && (
              <div className="rounded-xl border border-black/8 bg-white px-5 py-8 text-center text-sm text-[#5f6268]">
                No bookings on this day.
              </div>
            )}
            {dayBookings.map((b) => <BookingCard key={b.id} booking={b} />)}
          </div>
        </div>
      )}
    </div>
  )
}
