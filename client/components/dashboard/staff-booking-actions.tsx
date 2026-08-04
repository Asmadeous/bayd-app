"use client"

import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Navigation } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MeetingButton } from "@/components/dashboard/meeting-button"
import api from "@/lib/api"
import type { Booking } from "@/lib/hooks/use-bookings"

// Actions a technician has on their own booking card: join the work-scope call,
// navigate to the customer, and add an overtime charge if the service ran over.
export function StaffBookingActions({ booking }: { booking: Booking }) {
  const qc = useQueryClient()
  const [amount, setAmount] = useState("")
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const lat = booking.service_latitude
  const lng = booking.service_longitude
  const canNavigate = !!lat && !!lng

  const overtime = useMutation({
    mutationFn: () =>
      api
        .post<{ mode: string; url?: string }>(`/employee/bookings/${booking.id}/overtime`, {
          amount: Number(amount),
        })
        .then((r) => r.data),
    onSuccess: (data) => {
      setAmount("")
      qc.invalidateQueries({ queryKey: ["employee-schedule"] })
      if (data.mode === "link" && data.url) {
        setMsg({ type: "success", text: "Charge added — payment link sent to the customer." })
      } else {
        setMsg({ type: "success", text: "Overtime charged." })
      }
    },
    onError: () => setMsg({ type: "error", text: "Could not add the charge." }),
  })

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {(booking.status === "confirmed" || booking.status === "in_progress") && (
          <MeetingButton booking={booking} />
        )}
        {canNavigate && (
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-black/15 px-3 text-xs font-semibold text-[#101217] hover:bg-black/[0.03]"
          >
            <Navigation className="size-3.5 text-[#c96c83]" /> Navigate
          </a>
        )}
      </div>

      {/* Overtime — service ran over the allocated time */}
      <div className="flex items-center gap-1.5">
        <input
          type="number" min="0" step="1" inputMode="decimal" placeholder="Overtime $"
          value={amount} onChange={(e) => setAmount(e.target.value)}
          className="h-8 w-24 rounded-lg border border-black/15 px-2 text-sm focus:border-[#c96c83] focus:outline-none"
        />
        <Button
          size="xs" variant="outline"
          disabled={overtime.isPending || !amount}
          onClick={() => overtime.mutate()}
        >
          {overtime.isPending ? "…" : "Charge"}
        </Button>
      </div>
      {msg ? (
        <p className={`text-xs font-medium ${msg.type === "success" ? "text-green-700" : "text-red-700"}`}>
          {msg.text}
        </p>
      ) : null}
    </div>
  )
}
