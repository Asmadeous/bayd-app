"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"

import api from "@/lib/api"
import { useRescheduleBooking, type Booking } from "@/lib/hooks/use-bookings"
import { useAdminRescheduleBooking } from "@/lib/hooks/use-admin"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface AvailabilityResult {
  slots: string[]
  mapped: boolean
}

const TODAY = new Date().toISOString().split("T")[0]

// Reschedule an existing booking to a new open slot for the SAME service + tech.
// Reuses the /availability endpoint (travel-filtered) so the
// customer only sees slots the tech can actually take. The backend enforces the
// 24h cutoff + 2-reschedule cap and returns a typed code on failure.
export function RescheduleDialog({ booking, admin = false }: { booking: Booking; admin?: boolean }) {
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")
  const [error, setError] = useState<string | null>(null)
  const customerReschedule = useRescheduleBooking()
  const adminReschedule = useAdminRescheduleBooking()
  const reschedule = admin ? adminReschedule : customerReschedule

  const availability = useQuery<AvailabilityResult>({
    queryKey: ["availability", booking.service.id, booking.employee_profile.id, date],
    enabled: open && !!date,
    queryFn: () =>
      api
        .get<AvailabilityResult>("/availability", {
          params: { service_id: booking.service.id, employee_id: booking.employee_profile.id, date },
        })
        .then((r) => r.data),
  })
  const slots = availability.data?.slots ?? []

  function submit() {
    if (!date || !time) return
    setError(null)
    reschedule.mutate(
      { id: booking.id, starts_at: `${date}T${time}:00` },
      {
        onSuccess: () => {
          setOpen(false)
          setDate("")
          setTime("")
        },
        onError: (err: unknown) => {
          const data = (err as { response?: { data?: { error?: string } } })?.response?.data
          setError(data?.error ?? "Couldn't reschedule. Please try again.")
        },
      },
    )
  }

  // Admins are uncapped; customers get 2 self-reschedules per booking.
  const remaining = admin ? Infinity : Math.max(0, 2 - booking.reschedule_count)
  const capReached = !admin && remaining === 0

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="xs" disabled={capReached}>
          {capReached ? "Reschedule limit reached" : "Reschedule"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reschedule appointment</DialogTitle>
          <DialogDescription>
            Pick a new open time for {booking.service?.name ?? "this service"} with the same technician.
            {admin ? null : ` You can reschedule ${remaining} more time${remaining === 1 ? "" : "s"}.`}
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          {error ? (
            <p aria-live="polite" className="mb-3 border border-[#b75c68]/25 bg-[#fff5f6] px-3 py-2 text-sm font-semibold text-[#8f3f4b]">
              {error}
            </p>
          ) : null}

          <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-[#6b6f76]">New date</label>
          <input
            type="date"
            min={TODAY}
            value={date}
            onChange={(e) => { setDate(e.target.value); setTime("") }}
            className="h-11 w-full border border-black/15 bg-white px-3 text-sm font-semibold text-[#101217] outline-none focus:border-[#c96c83]"
          />

          {date ? (
            <div className="mt-4">
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-[#6b6f76]">Open times</label>
              {availability.isLoading ? (
                <p className="text-sm text-[#8a8d93]">Loading open times…</p>
              ) : slots.length === 0 ? (
                <p className="text-sm text-[#8a8d93]">No open times that day — try another date.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {slots.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setTime(s)}
                      className={`border px-3 py-2 text-sm font-bold transition-colors ${
                        time === s ? "border-[#c96c83] bg-[#c96c83]/10 text-[#c96c83]" : "border-black/15 bg-white text-[#5f6268] hover:border-black/30"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <Button
            size="sm"
            disabled={!date || !time || reschedule.isPending}
            onClick={submit}
            style={{ background: "#c96c83", border: "none", color: "#fff" }}
          >
            {reschedule.isPending ? "Rescheduling…" : "Confirm new time"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
