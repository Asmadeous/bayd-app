"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { X } from "lucide-react"

import api from "@/lib/api"
import { useRescheduleBooking, type Booking } from "@/lib/hooks/use-bookings"
import { cardClass, inputClass, labelClass, mutedClass } from "../app-theme"

interface AvailabilityResult {
  slots: string[]
  mapped: boolean
}

const TODAY = new Date().toISOString().split("T")[0]

// App-native reschedule: same flow as the website RescheduleDialog. Pick a date,
// fetch the SAME tech's open slots for that service+date from /availability (which
// already subtracts bookings + travel), and let the customer choose only a real
// free time. The backend re-validates hours/travel/double-book and enforces the
// 24h cutoff + 2-reschedule cap. Customers never type a raw time.
export function RescheduleSheet({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const [date, setDate] = useState("")
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
    <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={onClose}>
      <div
        className={`w-full rounded-t-3xl bg-[#F6F1EC] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] ${cardClass}`}
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

        <label className={labelClass}>New date</label>
        <input
          type="date"
          min={TODAY}
          value={date}
          onChange={(e) => { setDate(e.target.value); setTime("") }}
          className={inputClass}
        />

        {date ? (
          <div className="mt-4">
            <label className={labelClass}>Open times</label>
            {availability.isLoading ? (
              <p className={`text-sm ${mutedClass}`}>Loading open times…</p>
            ) : slots.length === 0 ? (
              <p className={`text-sm ${mutedClass}`}>No open times that day — try another date.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {slots.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setTime(s)}
                    className={`rounded-xl border px-3 py-2 text-sm font-bold transition-colors ${
                      time === s
                        ? "border-[#C96C83] bg-[#C96C83]/10 text-[#C96C83]"
                        : "border-black/15 bg-white text-[#14100F]/60"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : null}

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
