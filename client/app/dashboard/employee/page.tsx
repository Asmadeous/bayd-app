"use client"

import { useState } from "react"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { AppCalendar } from "@/components/dashboard/app-calendar"
import { BookingCard } from "@/components/dashboard/booking-card"
import { StatCard } from "@/components/dashboard/stat-card"
import { TimeClock } from "@/components/dashboard/time-clock"
import { StaffBookingActions } from "@/components/dashboard/staff-booking-actions"
import { useEmployeeProfile, useEmployeeSchedule } from "@/lib/hooks/use-employee"
import type { Booking } from "@/lib/hooks/use-bookings"

export default function EmployeeDashboardPage() {
  const { data: profile } = useEmployeeProfile()
  const { data, isLoading } = useEmployeeSchedule(1)
  const [selectedDay, setSelectedDay] = useState<{ date: Date; bookings: Booking[] } | null>(null)

  const bookings = data?.data ?? []
  const upcoming = bookings.filter((b) => b.status === "confirmed" || b.status === "pending")
  const inProgress = bookings.filter((b) => b.status === "in_progress")

  return (
    <div className="space-y-8">
      <DashboardHeader
        title="My Schedule"
        subtitle="Your upcoming appointments and shift status"
      />

      <TimeClock />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="On Shift" value={profile?.on_shift ? "Yes" : "No"} accent={profile?.on_shift} />
        <StatCard label="Upcoming" value={upcoming.length} />
        <StatCard label="In Progress" value={inProgress.length} />
        <StatCard label="Total Bookings" value={bookings.length} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AppCalendar
          bookings={bookings}
          onSelectDay={(date, bks) => setSelectedDay({ date, bookings: bks })}
        />

        <div className="space-y-3">
          <h2 className="font-semibold text-[#101217] text-sm">
            {selectedDay
              ? selectedDay.date.toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric" })
              : "Upcoming Appointments"}
          </h2>
          {isLoading ? (
            <div className="text-sm text-[#5f6268]">Loading…</div>
          ) : (selectedDay ? selectedDay.bookings : upcoming).length === 0 ? (
            <div className="rounded-xl border border-black/8 bg-white px-5 py-8 text-center text-sm text-[#5f6268]">
              No appointments.
            </div>
          ) : (
            (selectedDay ? selectedDay.bookings : upcoming.slice(0, 5)).map((b) => (
              <BookingCard
                key={b.id}
                booking={b}
                actions={<StaffBookingActions booking={b} />}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
