import Link from "next/link"
import { ChevronRight } from "lucide-react"

import { formatBookingDate, formatBookingTime } from "@/lib/booking-time"
import type { Booking } from "@/lib/hooks/use-bookings"
import { cn } from "@/lib/utils"

const BADGE: Record<Booking["status"], string> = {
  pending: "bg-[#D4A843]/15 text-[#8a6a1f]",
  confirmed: "bg-[#C96C83]/12 text-[#9E4A60]",
  in_progress: "bg-[#D4A843]/15 text-[#8a6a1f]",
  completed: "bg-[#4E9A57]/12 text-[#3f7e47]",
  cancelled: "bg-black/[0.06] text-[#14100F]/55",
  no_show: "bg-[#D4754A]/12 text-[#a4532e]",
  missed: "bg-black/[0.08] text-[#14100F]/70",
}

// A booking in a list: what, when, and with whom. Tap it for the appointment
// screen, which holds the full details and every action. `title` overrides the
// service name (a multi-service visit lists every service).
export function BookingRow({
  booking,
  who,
  href,
  title,
}: {
  booking: Booking
  who?: string | null
  href: string
  title?: string
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-3 rounded-2xl border border-black/5 bg-white p-4 shadow-[0_1px_2px_rgba(20,16,15,0.04),0_8px_24px_-12px_rgba(20,16,15,0.12)] transition-transform active:scale-[0.99]"
      >
        <div className="min-w-0 flex-1">
          <span className={cn("rounded-full px-2 py-0.5 text-[0.8125rem] font-bold uppercase tracking-[0.08em]", BADGE[booking.status])}>
            {booking.status.replace("_", " ")}
          </span>
          <p className="mt-1.5 truncate text-base font-extrabold">{title ?? booking.service?.name}</p>
          <p className="truncate text-sm text-[#14100F]/60">
            {formatBookingDate(booking.starts_at)} · {formatBookingTime(booking.starts_at)}
            {who ? ` · ${who}` : ""}
          </p>
        </div>
        <ChevronRight className="size-5 shrink-0 text-[#14100F]/30" aria-hidden />
      </Link>
    </li>
  )
}
