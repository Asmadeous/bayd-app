"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { CalendarDays, CheckCircle2, Clock3, Gift, Sparkles } from "lucide-react"

import { AppCalendar } from "@/components/dashboard/app-calendar"
import { BookingCard } from "@/components/dashboard/booking-card"
import { DashboardHero } from "@/components/dashboard/dashboard-hero"
import { DashboardPage } from "@/components/dashboard/dashboard-page"
import { DashboardPanel } from "@/components/dashboard/dashboard-panel"
import { EmptyState } from "@/components/dashboard/empty-state"
import { MetricCard } from "@/components/dashboard/metric-card"
import { StatusBadgeFor } from "@/components/dashboard/status-badge"
import { Button } from "@/components/ui/button"
import { useBookings } from "@/lib/hooks/use-bookings"
import type { Booking } from "@/lib/hooks/use-bookings"

export default function CustomerDashboardPage() {
  const { data, isLoading } = useBookings(1)
  const bookings = useMemo(() => data?.data ?? [], [data?.data])
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const selectedDateKey = formatDateKey(selectedDate)
  const bookServiceHref = `/book?date=${selectedDateKey}`
  const selectedDayBookings = useMemo(
    () => bookings.filter((booking) => booking.starts_at.slice(0, 10) === selectedDateKey),
    [bookings, selectedDateKey]
  )
  const upcoming = bookings
    .filter((b) => b.status === "confirmed" || b.status === "pending")
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
  const completed = bookings.filter((b) => b.status === "completed")
  const nextBooking = upcoming[0]

  return (
    <DashboardPage maxWidth="wide">
      <DashboardHero
        eyebrow="Customer dashboard"
        title="Your beauty schedule, ready when you are."
        description="Review upcoming appointments, book your next service, and keep your Beauty @ Your Door account organized."
        actions={
          <Link href={bookServiceHref}>
            <Button className="h-10 bg-white px-4 font-bold text-[#17110d] hover:bg-white/90">
              <Sparkles aria-hidden="true" />
              Book a Service
            </Button>
          </Link>
        }
        aside={
          <div className="border border-white/12 bg-white/8 p-4">
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
                No appointment is scheduled yet. Book a service when you are ready.
              </p>
            )}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard accent icon={Clock3} label="Upcoming" value={upcoming.length} />
        <MetricCard icon={CheckCircle2} label="Completed" value={completed.length} />
        <MetricCard icon={CalendarDays} label="Total bookings" value={bookings.length} />
        <MetricCard detail="Rewards view coming soon" icon={Gift} label="Loyalty points" value="-" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(360px,0.75fr)]">
        <AppCalendar
          bookings={bookings}
          onSelectDay={(date) => setSelectedDate(date)}
          footer={
            <SelectedDayAppointments
              bookings={selectedDayBookings}
              bookHref={bookServiceHref}
              date={selectedDate}
              isLoading={isLoading}
            />
          }
        />

        <div className="space-y-6">
          <DashboardPanel className="space-y-4" tone="warm">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a36f4d]">
                Quick booking
              </p>
              <h2 className="mt-1 text-lg font-extrabold text-[#101217]">Book for the selected date</h2>
              <p className="mt-2 text-sm leading-6 text-[#5f6268]">
                Choose a day on the calendar, then continue with that date already filled in.
              </p>
            </div>
            <Link href={bookServiceHref}>
              <Button className="h-11 w-full bg-[#101217] font-bold text-white hover:bg-[#101217]/90">
                <Sparkles aria-hidden="true" />
                Book a Service
              </Button>
            </Link>
          </DashboardPanel>

          <DashboardPanel>
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a36f4d]">
                  Appointments
                </p>
                <h2 className="mt-1 text-lg font-extrabold text-[#101217]">Upcoming</h2>
              </div>
              <Link
                href="/dashboard/customer/bookings"
                className="text-sm font-bold text-[#c96c83] hover:underline"
              >
                View all
              </Link>
            </div>

            {isLoading ? (
              <p className="text-sm text-[#5f6268]">Loading appointments...</p>
            ) : upcoming.length === 0 ? (
              <EmptyState
                action={
                  <Link href={bookServiceHref}>
                    <Button size="sm" style={{ background: "#c96c83", border: "none", color: "#fff" }}>
                      Book now
                    </Button>
                  </Link>
                }
                className="border-black/8 py-10"
                icon={Sparkles}
                title="No upcoming appointments"
                description="Choose a service and schedule a mobile appointment at your location."
              />
            ) : (
              <div className="space-y-3">
                {upcoming.slice(0, 4).map((booking) => (
                  <BookingCard booking={booking} key={booking.id} />
                ))}
              </div>
            )}
          </DashboardPanel>
        </div>
      </div>
    </DashboardPage>
  )
}

function SelectedDayAppointments({
  bookings,
  bookHref,
  date,
  isLoading,
}: {
  bookings: Booking[]
  bookHref: string
  date: Date
  isLoading: boolean
}) {
  const label = date.toLocaleDateString("en-CA", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a36f4d]">
            Selected day
          </p>
          <h3 className="mt-1 text-base font-extrabold text-[#101217]">{label}</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="border border-black/8 bg-[#fbfaf7] px-2.5 py-1 text-xs font-bold text-[#5f6268]">
            {bookings.length} {bookings.length === 1 ? "event" : "events"}
          </span>
          <Link href={bookHref}>
            <Button size="sm" style={{ background: "#c96c83", border: "none", color: "#fff" }}>
              Book this date
            </Button>
          </Link>
        </div>
      </div>

      {isLoading ? (
        <p className="mt-4 text-sm text-[#5f6268]">Loading appointments...</p>
      ) : bookings.length === 0 ? (
        <p className="mt-4 border border-dashed border-black/10 bg-[#fbfaf7] px-4 py-5 text-sm leading-6 text-[#5f6268]">
          No appointment is scheduled for this date.
        </p>
      ) : (
        <div className="mt-4 space-y-2">
          {bookings.map((booking) => (
            <div
              className="flex flex-col gap-2 border border-black/8 bg-[#fbfaf7] px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              key={booking.id}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold text-[#101217]">
                  {booking.service?.name ?? "Beauty appointment"}
                </p>
                <p className="mt-1 text-xs font-medium text-[#5f6268]">
                  {formatBookingTime(booking.starts_at)}
                </p>
              </div>
              <StatusBadgeFor status={booking.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function formatBookingTime(value: string) {
  return new Date(value).toLocaleTimeString("en-CA", {
    hour: "numeric",
    minute: "2-digit",
  })
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
