"use client"

import Link from "next/link"
import { BarChart3, CalendarDays, CheckCircle2, Clock3, Inbox, Users } from "lucide-react"

import { BookingCard } from "@/components/dashboard/booking-card"
import { DashboardHero } from "@/components/dashboard/dashboard-hero"
import { DashboardPage } from "@/components/dashboard/dashboard-page"
import { DashboardPanel } from "@/components/dashboard/dashboard-panel"
import { EmptyState } from "@/components/dashboard/empty-state"
import { MetricCard } from "@/components/dashboard/metric-card"
import { TutorialButton } from "@/components/dashboard/tutorial-button"
import { Button } from "@/components/ui/button"
import { useAdminBookings } from "@/lib/hooks/use-admin"
import { adminDashboardSteps } from "@/lib/tours/admin-tour"

const quickLinks = [
  { label: "Calendar", href: "/dashboard/admin/calendar", icon: CalendarDays },
  { label: "Bookings", href: "/dashboard/admin/bookings", icon: Clock3 },
  { label: "Employees", href: "/dashboard/admin/employees", icon: Users },
  { label: "Inquiries", href: "/dashboard/admin/inquiries", icon: Inbox },
]

export default function AdminDashboardPage() {
  const { data: allData, isLoading } = useAdminBookings({ page: 1 })

  const bookings = allData?.data ?? []
  const confirmed = bookings.filter((b) => b.status === "confirmed")
  const inProgress = bookings.filter((b) => b.status === "in_progress")
  const completed = bookings.filter((b) => b.status === "completed")
  const activeWork = confirmed.length + inProgress.length

  return (
    <DashboardPage maxWidth="wide">
      <DashboardHero
        data-tour="admin-hero"
        eyebrow="Admin command center"
        title="Keep bookings, people, and service flow in view."
        description="Monitor active appointments, jump into operational queues, and keep Beauty @ Your Door moving from one dashboard."
        actions={
          <>
            <Link href="/dashboard/admin/calendar">
              <Button className="h-10 bg-white px-4 font-bold text-[#17110d] hover:bg-white/90">
                <CalendarDays aria-hidden="true" />
                Open Calendar
              </Button>
            </Link>
            <Link href="/dashboard/admin/analytics">
              <Button
                className="h-10 border-white/20 bg-transparent px-4 font-bold text-white hover:bg-white/10"
                variant="outline"
              >
                <BarChart3 aria-hidden="true" />
                Analytics
              </Button>
            </Link>
          </>
        }
        aside={
          <div className="border border-white/12 bg-white/8 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#f0c8d3]">
              Active work
            </p>
            <p className="mt-3 font-heading text-5xl font-extrabold leading-none text-white">
              {activeWork}
            </p>
            <p className="mt-3 text-sm leading-6 text-white/68">
              Confirmed or in-progress bookings from the current booking feed.
            </p>
          </div>
        }
      />

      <div data-tour="admin-metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={CalendarDays}
          label="Total bookings"
          value={allData?.pagination?.total_count ?? "-"}
        />
        <MetricCard accent icon={Clock3} label="Confirmed" value={confirmed.length} />
        <MetricCard icon={BarChart3} label="In progress" value={inProgress.length} />
        <MetricCard icon={CheckCircle2} label="Completed" value={completed.length} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
        <DashboardPanel data-tour="admin-shortcuts">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a36f4d]">
              Shortcuts
            </p>
            <h2 className="mt-1 text-lg font-extrabold text-[#101217]">Operations</h2>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {quickLinks.map((link) => {
              const Icon = link.icon

              return (
                <Link
                  className="group flex items-center gap-3 border border-black/10 bg-[#fbfaf7] p-4 transition-colors hover:border-[#c96c83]/35 hover:bg-white"
                  href={link.href}
                  key={link.href}
                >
                  <span className="grid size-10 place-items-center bg-[#101217] text-white transition-colors group-hover:bg-[#c96c83]">
                    <Icon aria-hidden="true" className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-extrabold text-[#101217]">
                    {link.label}
                  </span>
                </Link>
              )
            })}
          </div>
        </DashboardPanel>

        <DashboardPanel data-tour="admin-recent-bookings">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a36f4d]">
                Booking feed
              </p>
              <h2 className="mt-1 text-lg font-extrabold text-[#101217]">Recent Bookings</h2>
            </div>
            <Link
              href="/dashboard/admin/bookings"
              className="text-sm font-bold text-[#c96c83] hover:underline"
            >
              View all
            </Link>
          </div>

          {isLoading ? (
            <p className="text-sm text-[#5f6268]">Loading bookings...</p>
          ) : bookings.length === 0 ? (
            <EmptyState
              className="border-black/8 py-10"
              icon={CalendarDays}
              title="No bookings yet"
              description="Bookings will appear here once customers submit appointment requests."
            />
          ) : (
            <div className="space-y-3">
              {bookings.slice(0, 6).map((booking) => (
                <BookingCard booking={booking} key={booking.id} />
              ))}
            </div>
          )}
        </DashboardPanel>
      </div>

      <TutorialButton steps={adminDashboardSteps} pageKey="admin-dashboard" />
    </DashboardPage>
  )
}
