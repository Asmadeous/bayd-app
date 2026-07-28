"use client"

import Link from "next/link"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { StatCard } from "@/components/dashboard/stat-card"
import { BookingCard } from "@/components/dashboard/booking-card"
import { useAdminBookings } from "@/lib/hooks/use-admin"

export default function AdminDashboardPage() {
  const { data: allData } = useAdminBookings({ page: 1 })
  const { data: todayData } = useAdminBookings({ page: 1 })

  const bookings = allData?.data ?? []
  const confirmed = bookings.filter((b) => b.status === "confirmed")
  const inProgress = bookings.filter((b) => b.status === "in_progress")
  const completed = bookings.filter((b) => b.status === "completed")

  return (
    <div className="space-y-8">
      <DashboardHeader
        title="Admin Overview"
        subtitle="Company-wide performance at a glance"
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Bookings" value={allData?.pagination?.total_count ?? "—"} />
        <StatCard label="Confirmed" value={confirmed.length} accent />
        <StatCard label="In Progress" value={inProgress.length} />
        <StatCard label="Completed" value={completed.length} />
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Calendar", href: "/dashboard/admin/calendar" },
          { label: "Bookings", href: "/dashboard/admin/bookings" },
          { label: "Employees", href: "/dashboard/admin/employees" },
          { label: "Inquiries", href: "/dashboard/admin/inquiries" },
        ].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-xl border border-black/8 bg-white px-4 py-3 text-sm font-semibold text-[#101217] hover:border-[#c96c83]/40 transition-colors text-center"
          >
            {link.label}
          </Link>
        ))}
      </div>

      {/* Recent bookings */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-[#101217] text-sm">Recent Bookings</h2>
          <Link href="/dashboard/admin/bookings" className="text-xs text-[#c96c83] hover:underline font-medium">
            View all
          </Link>
        </div>
        {bookings.slice(0, 6).map((b) => <BookingCard key={b.id} booking={b} />)}
      </div>
    </div>
  )
}
