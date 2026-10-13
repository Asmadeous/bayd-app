"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { DateStrip, weekRange } from "@/components/booking/date-strip"
import { formatTime } from "@/components/booking/time-groups"
import { DayTimeline } from "@/components/calendar/day-timeline"
import { useConfirm, useToast } from "@/lib/app-ui/app-ui-provider"
import { useAdminBookableWindows, useAdminBookingsRange, useAdminEmployees, useAdminRescheduleBooking } from "@/lib/hooks/use-admin"
import { bookingDateKey, formatBookingTime, formatDateKey, todayKey } from "@/lib/booking-time"
import type { Booking } from "@/lib/hooks/use-bookings"
import { cardClass, eyebrowClass, mutedClass } from "./admin-theme"

// The web admin calendar on a phone: every technician's bookings or one's,
// with that tech's bookable hours shaded. Tap a booking to open it, tap an open
// time to book it (date, time and tech filled in), press and hold a booking to
// move it; the move is confirmed first and checked like the web's.
export function AdminCalendar() {
  const router = useRouter()
  const confirm = useConfirm()
  const { toast } = useToast()
  const [employeeId, setEmployeeId] = useState<number | undefined>()
  const [showCancelled, setShowCancelled] = useState(false)
  const [day, setDay] = useState(todayKey)
  const [range, setRange] = useState(() => weekRange(todayKey()))
  const { data: employees } = useAdminEmployees()
  const { data: visible = [] } = useAdminBookingsRange(range.from, range.to, employeeId)
  const { data: dayBookings = [], isLoading } = useAdminBookingsRange(day, day, employeeId)
  const { data: windows } = useAdminBookableWindows(employeeId, day, day)
  const reschedule = useAdminRescheduleBooking()

  // Cancelled bookings stay hidden unless asked for, as on the web.
  const shown = (list: Booking[]) => (showCancelled ? list : list.filter((b) => b.status !== "cancelled"))
  const marks = new Set(shown(visible).map((b) => bookingDateKey(b.starts_at)))
  const bookings = shown(dayBookings).filter((b) => bookingDateKey(b.starts_at) === day)

  async function move(booking: Booking, time: string) {
    const label = `${formatDateKey(day, { weekday: "long", month: "long", day: "numeric" })} at ${formatTime(time)}`
    const ok = await confirm({
      title: "Move this booking?",
      message: `${booking.service?.name} for ${booking.customer_name ?? "the client"} moves from ${formatBookingTime(booking.starts_at)} to ${label}. The client and technician are notified. Business hours, travel time and double-booking are checked; if the new time doesn't work, nothing changes.`,
      confirmLabel: "Move booking",
      cancelLabel: "Keep it",
    })
    if (!ok) return
    try {
      await reschedule.mutateAsync({ id: booking.id, starts_at: `${day}T${time}:00` })
      toast({ title: "Booking moved", description: `${booking.service?.name} is now ${label}.`, variant: "success" })
    } catch (error: unknown) {
      const data = (error as { response?: { data?: { error?: string } } })?.response?.data
      toast({ title: "Booking not moved", description: data?.error ?? "That time isn't available.", variant: "error" })
    }
  }

  function book(time: string) {
    const params = new URLSearchParams({ date: day, time })
    if (employeeId) params.set("employee_id", String(employeeId))
    router.push(`/admin/bookings/new?${params}`)
  }

  return (
    <div className="space-y-3">
      <select
        aria-label="Filter by technician"
        value={employeeId ?? ""}
        onChange={(e) => setEmployeeId(e.target.value ? Number(e.target.value) : undefined)}
        className="h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-base font-semibold text-[#14100F] outline-none focus:border-[#C96C83]"
      >
        <option value="">All technicians</option>
        {(employees?.data ?? []).map((ep) => (
          <option key={ep.id} value={ep.id}>
            {ep.name ?? `Tech #${ep.id}`}
          </option>
        ))}
      </select>

      <label className="flex items-center gap-2 px-1 text-sm font-semibold text-[#14100F]/70">
        <input type="checkbox" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} className="size-4 accent-[#C96C83]" />
        Show cancelled
      </label>

      <div className={`${cardClass} p-4`}>
        <DateStrip value={day} onChange={setDay} allowPast marks={marks} onVisibleRangeChange={(from, to) => setRange({ from, to })} />
      </div>

      <h2 className={`px-1 ${eyebrowClass}`}>{formatDateKey(day, { weekday: "long", month: "short", day: "numeric" })}</h2>
      {isLoading ? (
        <p className={`px-1 text-sm ${mutedClass}`}>Loading…</p>
      ) : (
        <DayTimeline
          day={day}
          bookings={bookings}
          who={(b) => [b.customer_name, b.employee_profile?.name].filter(Boolean).join(" · ")}
          onOpen={(b) => router.push(`/admin/bookings/view?id=${b.id}`)}
          onSlot={book}
          onMove={move}
          availability={employeeId ? (windows?.[day] ?? []) : undefined}
        />
      )}
    </div>
  )
}
