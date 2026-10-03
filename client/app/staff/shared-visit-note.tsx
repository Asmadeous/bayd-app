import { Users } from "lucide-react"

import { formatBookingTime } from "@/lib/booking-time"
import type { Booking } from "@/lib/hooks/use-bookings"

// The client booked several services in one visit: the rest of it, in order,
// and who does each, so the tech knows who they're sharing the appointment with.
export function SharedVisitNote({ booking }: { booking: Booking }) {
  const others = (booking.visit_lines ?? []).filter((l) => l.status !== "cancelled")
  if (others.length === 0) return null

  return (
    <div className="mt-2 rounded-lg bg-[#D4A843]/12 px-3 py-2">
      <p className="flex items-center gap-1.5 text-[0.8125rem] font-bold uppercase tracking-[0.08em] text-[#8a6a1f]">
        <Users className="size-3.5" aria-hidden /> Same visit
      </p>
      <ul className="mt-1 space-y-0.5">
        {others.map((l) => (
          <li key={l.id} className="text-sm text-[#14100F]">
            <span className="font-semibold">{l.service_name}</span> · {formatBookingTime(l.starts_at)}
            {l.employee.id === booking.employee_profile?.id ? " · you" : l.employee.name ? ` · ${l.employee.name}` : ""}
          </li>
        ))}
      </ul>
    </div>
  )
}

// Another tech is on this visit, so moving it is the office's call.
export function sharedWithOtherTech(booking: Booking) {
  return (booking.visit_lines ?? []).some((l) => l.status !== "cancelled" && l.employee.id !== booking.employee_profile?.id)
}
