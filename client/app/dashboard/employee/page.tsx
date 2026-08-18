"use client"

import { useState } from "react"
import Link from "next/link"
import { CalendarDays, CheckCircle2, Clock3, List, MapPin, Plus, ToggleLeft, ToggleRight } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"

import { AppCalendar } from "@/components/dashboard/app-calendar"
import { BookingCard } from "@/components/dashboard/booking-card"
import { DashboardHero } from "@/components/dashboard/dashboard-hero"
import { DashboardPage } from "@/components/dashboard/dashboard-page"
import { DashboardPanel } from "@/components/dashboard/dashboard-panel"
import {
  DashboardToolbar,
  SegmentedControl,
  SegmentButton,
  ToolbarSection,
} from "@/components/dashboard/dashboard-toolbar"
import { EmptyState } from "@/components/dashboard/empty-state"
import { MetricCard } from "@/components/dashboard/metric-card"
import { StaffBookingActions } from "@/components/dashboard/staff-booking-actions"
import { TutorialButton } from "@/components/dashboard/tutorial-button"
import { Button } from "@/components/ui/button"
import { useEmployeeProfile, useEmployeeSchedule, useToggleShift } from "@/lib/hooks/use-employee"
import { employeeDashboardSteps } from "@/lib/tours/employee-tour"
import type { Booking } from "@/lib/hooks/use-bookings"

type ScheduleView = "list" | "calendar"

export default function EmployeeDashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: profile } = useEmployeeProfile()
  const { data, isLoading } = useEmployeeSchedule(1)
  const toggleShift = useToggleShift()
  const [view, setView] = useState<ScheduleView>(
    searchParams.get("view") === "calendar" ? "calendar" : "list",
  )
  const [selectedDay, setSelectedDay] = useState<{ date: Date; bookings: Booking[] } | null>(null)

  const bookings = data?.data ?? []
  const upcoming = bookings
    .filter((b) => b.status === "confirmed" || b.status === "pending")
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
  const inProgress = bookings.filter((b) => b.status === "in_progress")
  const nextBooking = upcoming[0]
  const visibleBookings = selectedDay ? selectedDay.bookings : upcoming.slice(0, 5)
  const listBookings = bookings
    .slice()
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())

  function selectView(nextView: ScheduleView) {
    setView(nextView)
    router.replace(
      nextView === "calendar" ? "/dashboard/employee?view=calendar" : "/dashboard/employee",
      { scroll: false },
    )
  }

  return (
    <DashboardPage maxWidth="wide">
      <DashboardHero
        data-tour="employee-hero"
        eyebrow="Employee schedule"
        title={profile?.on_shift ? "You are live for appointments." : "Start your shift when you are ready."}
        description="Track your assigned bookings, review the calendar, and keep your mobile service schedule organized."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/dashboard/employee/new-booking"
              data-tour="employee-new-booking"
              className="inline-flex h-10 items-center gap-1.5 border border-white/25 bg-white/10 px-4 text-sm font-bold text-white transition-colors hover:bg-white/20"
            >
              <Plus aria-hidden="true" className="size-4" /> New booking
            </Link>
            <Button
              data-tour="employee-shift-toggle"
              className="h-10 px-4 font-bold text-white"
              disabled={toggleShift.isPending}
              onClick={() => toggleShift.mutate()}
              style={
                profile?.on_shift
                  ? { background: "#5a9e5a", border: "none" }
                  : { background: "#c96c83", border: "none" }
              }
            >
              {profile?.on_shift ? (
                <ToggleRight aria-hidden="true" />
              ) : (
                <ToggleLeft aria-hidden="true" />
              )}
              {profile?.on_shift ? "End Shift" : "Start Shift"}
            </Button>
          </div>
        }
        aside={
          <div data-tour="employee-next-appointment" className="border border-white/12 bg-white/8 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#f0c8d3]">
              Next appointment
            </p>
            {nextBooking ? (
              <div className="mt-3">
                <p className="text-lg font-extrabold text-white">{nextBooking.service?.name}</p>
                <p className="mt-2 text-sm leading-6 text-white/68">
                  {formatBookingDate(nextBooking.starts_at)}
                </p>
              </div>
            ) : (
              <p className="mt-3 text-sm leading-6 text-white/68">
                No upcoming assignment is currently on your schedule.
              </p>
            )}
          </div>
        }
      />

      <div data-tour="employee-metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          accent={profile?.on_shift}
          icon={profile?.on_shift ? ToggleRight : ToggleLeft}
          label="On shift"
          value={profile?.on_shift ? "Yes" : "No"}
        />
        <MetricCard icon={CalendarDays} label="Upcoming" value={upcoming.length} />
        <MetricCard icon={Clock3} label="In progress" value={inProgress.length} />
        <MetricCard icon={CheckCircle2} label="Total bookings" value={bookings.length} />
      </div>

      <DashboardToolbar data-tour="employee-toolbar">
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
          {bookings.length} assigned appointments
        </ToolbarSection>
      </DashboardToolbar>

      <div data-tour="employee-schedule">
        {isLoading ? (
          <DashboardPanel>
            <p className="text-sm text-[#5f6268]">Loading schedule...</p>
          </DashboardPanel>
        ) : view === "calendar" ? (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(360px,0.75fr)]">
            <AppCalendar
              bookings={bookings}
              onSelectDay={(date, dayBookings) => setSelectedDay({ date, bookings: dayBookings })}
            />

            <SchedulePanel selectedDay={selectedDay} visibleBookings={visibleBookings} />
          </div>
        ) : listBookings.length === 0 ? (
          <EmptyState
            className="border-black/8 py-10"
            icon={MapPin}
            title="No appointments"
            description="Appointments assigned to you will appear here."
          />
        ) : (
          <DashboardPanel className="space-y-3">
            {listBookings.map((booking) => (
              <BookingCard
                actions={<StaffBookingActions booking={booking} />}
                booking={booking}
                key={booking.id}
              />
            ))}
          </DashboardPanel>
        )}
      </div>

      <TutorialButton
        steps={employeeDashboardSteps}
        pageKey="employee-dashboard"
      />
    </DashboardPage>
  )
}

function SchedulePanel({
  selectedDay,
  visibleBookings,
}: {
  selectedDay: { date: Date; bookings: Booking[] } | null
  visibleBookings: Booking[]
}) {
  return (
    <DashboardPanel>
      <div className="mb-4">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a36f4d]">
          Schedule
        </p>
        <h2 className="mt-1 text-lg font-extrabold text-[#101217]">
          {selectedDay
            ? selectedDay.date.toLocaleDateString("en-CA", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })
            : "Upcoming Appointments"}
        </h2>
      </div>

      {visibleBookings.length === 0 ? (
        <EmptyState
          className="border-black/8 py-10"
          icon={MapPin}
          title="No appointments"
          description="Appointments assigned to you will appear here."
        />
      ) : (
        <div className="space-y-3">
          {visibleBookings.map((booking) => (
            <BookingCard
              actions={<StaffBookingActions booking={booking} />}
              booking={booking}
              key={booking.id}
            />
          ))}
        </div>
      )}
    </DashboardPanel>
  )
}

function formatBookingDate(value: string) {
  const date = new Date(value)

  return date.toLocaleDateString("en-CA", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}
