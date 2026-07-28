"use client"

import Link from "next/link"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { StatCard } from "@/components/dashboard/stat-card"
import { BookingCard } from "@/components/dashboard/booking-card"
import { AppCalendar } from "@/components/dashboard/app-calendar"
import { Button } from "@/components/ui/button"
import { useBookings } from "@/lib/hooks/use-bookings"

export default function CustomerDashboardPage() {
  const { data, isLoading } = useBookings(1)
  const bookings = data?.data ?? []
  const upcoming = bookings.filter((b) => b.status === "confirmed" || b.status === "pending")
  const completed = bookings.filter((b) => b.status === "completed")

  return (
    <div className="space-y-8">
      <DashboardHeader
        title="Your Dashboard"
        subtitle="Manage your beauty appointments"
        actions={
          <Link href="/dashboard/customer/book">
            <Button className="h-9 px-4 text-sm font-medium text-white" style={{ background: "#c96c83", border: "none" }}>
              Book a Service
            </Button>
          </Link>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Upcoming" value={upcoming.length} accent />
        <StatCard label="Completed" value={completed.length} />
        <StatCard label="Total Bookings" value={bookings.length} />
        <StatCard label="Loyalty Points" value="—" sub="Coming soon" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calendar */}
        <AppCalendar bookings={bookings} />

        {/* Upcoming bookings */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-[#101217] text-sm">Upcoming Appointments</h2>
            <Link href="/dashboard/customer/bookings" className="text-xs text-[#c96c83] hover:underline font-medium">
              View all
            </Link>
          </div>
          {isLoading ? (
            <div className="text-sm text-[#5f6268]">Loading…</div>
          ) : upcoming.length === 0 ? (
            <div className="rounded-xl border border-black/8 bg-white px-5 py-8 text-center text-sm text-[#5f6268]">
              No upcoming appointments.{" "}
              <Link href="/dashboard/customer/book" className="text-[#c96c83] hover:underline">Book one now.</Link>
            </div>
          ) : (
            upcoming.slice(0, 4).map((b) => <BookingCard key={b.id} booking={b} />)
          )}
        </div>
      </div>
    </div>
  )
}
