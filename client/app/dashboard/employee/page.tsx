"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { CalendarDays, CheckCircle2, Clock3, List, MapPin, Plus } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"

import { StaffBookingCalendar } from "@/components/dashboard/role-booking-calendars"
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
import { useToast } from "@/components/bayd-toast-provider"
import { Button } from "@/components/ui/button"
import { useEmployeeProfile, useEmployeeSchedule, useEmployeeScheduleList } from "@/lib/hooks/use-employee"
import { useCurrentShift } from "@/lib/hooks/use-time-clock"
import { employeeDashboardSteps } from "@/lib/tours/employee-tour"

type ScheduleView = "list" | "calendar" | "past"

export default function EmployeeDashboardPage() {
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isError: isProfileError } = useEmployeeProfile()
  const { data, isError: isScheduleError, isLoading } = useEmployeeSchedule(1)
  const { data: currentShift } = useCurrentShift()
  const initialView = searchParams.get("view")
  const [view, setView] = useState<ScheduleView>(
    initialView === "calendar" ? "calendar" : initialView === "past" ? "past" : "list",
  )
  // The two lists, a page at a time ("Load more"). Job history (completed /
  // cancelled / no-show) loads only when the Past view is open.
  const activeList = useEmployeeScheduleList(undefined, { enabled: view === "list" })
  const pastList = useEmployeeScheduleList("past", { enabled: view === "past" })
  const { items: pastBookings, isLoading: isPastLoading } = pastList

  const bookings = data?.data ?? []
  const upcoming = bookings
    .filter((b) => b.status === "confirmed" || b.status === "pending")
    .sort((a, b) => getTime(a.starts_at) - getTime(b.starts_at))
  const inProgress = bookings.filter((b) => b.status === "in_progress")
  const nextBooking = upcoming[0]
  // All active jobs, not just the first page: the server total, less those in service.
  const upcomingCount = (data?.pagination.total_count ?? 0) - inProgress.length
  const listBookings = activeList.items

  useEffect(() => {
    if (isProfileError) {
      toast({
        title: "Profile not loaded",
        description: "Could not load your employee profile.",
        variant: "error",
      })
    }
  }, [isProfileError, toast])

  useEffect(() => {
    if (isScheduleError) {
      toast({
        title: "Schedule not loaded",
        description: "Could not load your assigned appointments.",
        variant: "error",
      })
    }
  }, [isScheduleError, toast])

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
        title={currentShift ? "You're clocked in on a job." : "Clock in on each job when you arrive."}
        description="Clock in and out on each job below, same as the staff app: from 30 minutes before, at the client's address."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/dashboard/employee/new-booking"
              data-tour="employee-new-booking"
              className="inline-flex h-10 items-center gap-1.5 border border-white/25 bg-white/10 px-4 text-sm font-bold text-white transition-colors hover:bg-white/20"
            >
              <Plus aria-hidden="true" className="size-4" /> New booking
            </Link>

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
          accent={!!currentShift}
          icon={Clock3}
          label="Clocked in"
          value={currentShift ? "On a job" : "No"}
        />
        <MetricCard icon={CalendarDays} label="Upcoming" value={upcomingCount} />
        <MetricCard icon={Clock3} label="In progress" value={inProgress.length} />
        <MetricCard icon={CheckCircle2} label="Total bookings" value={bookings.length} />
      </div>

      <DashboardToolbar data-tour="employee-toolbar">
        <ToolbarSection>
          <SegmentedControl>
            {([
              { icon: List, label: "List", value: "list" },
              { icon: CalendarDays, label: "Calendar", value: "calendar" },
              { icon: CheckCircle2, label: "Past", value: "past" },
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
        {isLoading || (view === "list" && activeList.isLoading) ? (
          <DashboardPanel>
            <p className="text-sm text-[#5f6268]">Loading schedule...</p>
          </DashboardPanel>
        ) : view === "past" ? (
          isPastLoading ? (
            <DashboardPanel>
              <p className="text-sm text-[#5f6268]">Loading past bookings...</p>
            </DashboardPanel>
          ) : pastBookings.length === 0 ? (
            <EmptyState
              className="border-black/8 py-10"
              icon={MapPin}
              title="No past bookings"
              description="Completed, cancelled, and no-show jobs will appear here."
            />
          ) : (
            <DashboardPanel className="space-y-3">
              {pastBookings.map((booking) => (
                <BookingCard
                  actions={<StaffBookingActions booking={booking} />}
                  booking={booking}
                  key={booking.id}
                />
              ))}
              <WebLoadMore list={pastList} />
            </DashboardPanel>
          )
        ) : view === "calendar" ? (
          <StaffBookingCalendar />
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
            <WebLoadMore list={activeList} />
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

function formatBookingDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"

  return date.toLocaleDateString("en-CA", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function getTime(value: string) {
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? Number.MAX_SAFE_INTEGER : time
}


function WebLoadMore({ list }: { list: { hasMore: boolean; loadingMore: boolean; loadMore: () => void } }) {
  if (!list.hasMore) return null
  return (
    <Button className="w-full" disabled={list.loadingMore} onClick={list.loadMore} variant="outline">
      {list.loadingMore ? "Loading..." : "Load more"}
    </Button>
  )
}
