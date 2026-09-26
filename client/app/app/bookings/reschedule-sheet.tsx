"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { X } from "lucide-react"

import { DateStrip } from "@/components/booking/date-strip"
import { TimeGroups } from "@/components/booking/time-groups"
import { BubbleLoader } from "@/components/bubble-loader"
import api from "@/lib/api"
import { formatDateKey, todayKey } from "@/lib/booking-time"
import { useRescheduleBooking, type Booking } from "@/lib/hooks/use-bookings"
import { cardClass, mutedClass } from "../app-theme"

interface AvailabilityResult {
  slots: string[]
  mapped: boolean
}

// App-native reschedule, with the same date strip and Morning / Afternoon /
// Evening times as booking. Pick a date, fetch the SAME tech's open slots for that
// service+date from /availability (which already subtracts bookings + travel),
// and let the customer choose only a real free time. The backend re-validates hours/travel/double-book and enforces the
// 24h cutoff + 2-reschedule cap. Customers never type a raw time.
export function RescheduleSheet({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const [date, setDate] = useState(() => todayKey())
  const [time, setTime] = useState("")
  const [error, setError] = useState<string | null>(null)
  const reschedule = useRescheduleBooking()

  const availability = useQuery<AvailabilityResult>({
    queryKey: ["availability", booking.service.id, booking.employee_profile.id, date],
    enabled: !!date,
    queryFn: () =>
      api
        .get<AvailabilityResult>("/availability", {
          params: { service_id: booking.service.id, employee_id: booking.employee_profile.id, date },
        })
        .then((r) => r.data),
  })
  const slots = availability.data?.slots ?? []

  const remaining = Math.max(0, 2 - booking.reschedule_count)

  function submit() {
    if (!date || !time) return
    setError(null)
    reschedule.mutate(
      { id: booking.id, starts_at: `${date}T${time}:00` },
      {
        onSuccess: () => onClose(),
        onError: (err: unknown) => {
          const data = (err as { response?: { data?: { error?: string } } })?.response?.data
          setError(data?.error ?? "Couldn't reschedule. Please try again.")
        },
      },
    )
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-black/40" onClick={onClose}>
      <div
        className={`max-h-[90dvh] w-full overflow-y-auto rounded-t-3xl bg-[#F6F1EC] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] ${cardClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-black tracking-tight text-[#14100F]">Reschedule</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1 text-[#14100F]/50">
            <X className="size-5" />
          </button>
        </div>
        <p className={`mb-4 text-sm ${mutedClass}`}>
          Pick a new open time for {booking.service?.name ?? "this service"} with the same technician. You can
          reschedule {remaining} more time{remaining === 1 ? "" : "s"}.
        </p>

        {error ? (
          <p aria-live="polite" className="mb-3 rounded-xl border border-[#8f3f4b]/25 bg-[#fff5f6] px-3 py-2 text-sm font-semibold text-[#8f3f4b]">
            {error}
          </p>
        ) : null}

        <DateStrip value={date} onChange={(d) => { setDate(d); setTime("") }} />
        <p className={`mt-1 text-center text-xs ${mutedClass}`}>Times are shown in Eastern time.</p>

        <h3 className="mt-4 border-t border-black/10 pt-4 text-base font-black tracking-tight">
          {date === todayKey() ? "Today, " : ""}
          {formatDateKey(date, { weekday: "long", month: "short", day: "numeric" })}
        </h3>
        <div className="mt-3">
          {availability.isLoading ? (
            <BubbleLoader className="py-4" label="Finding open times" />
          ) : slots.length === 0 ? (
            <p className={`text-sm ${mutedClass}`}>No open times that day. Try another date.</p>
          ) : (
            <TimeGroups times={slots} selected={time} onPick={setTime} />
          )}
        </div>

        <button
          type="button"
          disabled={!date || !time || reschedule.isPending}
          onClick={submit}
          className="mt-5 w-full rounded-2xl bg-[#C96C83] py-3.5 text-base font-bold text-white disabled:opacity-50"
        >
          {reschedule.isPending ? "Rescheduling…" : "Confirm new time"}
        </button>
      </div>
    </div>
  )
}
