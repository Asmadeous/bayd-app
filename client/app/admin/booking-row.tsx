import Link from "next/link"
import { CalendarDays, ChevronRight, Repeat2, UserRound } from "lucide-react"

import { StatusBadgeFor } from "@/components/dashboard/status-badge"
import { formatBookingDate, formatBookingTime } from "@/lib/booking-time"
import { formatMoney } from "@/lib/stores/franchise-store"
import { isVisit, visitLines } from "@/lib/visits"
import type { Booking } from "@/lib/hooks/use-bookings"
import { cardClass, mutedClass } from "./admin-theme"

const CLIENT_TYPE: Record<string, string> = { kids: "Kids", elderly: "Elderly", adult: "Adult" }

// One booking in an admin list, with the facts the web card shows. Opens the
// booking screen, where every action lives.
export function BookingRow({ booking }: { booking: Booking }) {
  const sharedWith = isVisit(booking)
    ? visitLines(booking).filter((l) => l.bookingId !== booking.id && l.tech.id !== booking.employee_profile?.id)
    : []
  const forWho =
    booking.client_type === "group"
      ? `Group of ${booking.party_size && booking.party_size > 1 ? booking.party_size : 2}`
      : booking.client_type
        ? CLIENT_TYPE[booking.client_type]
        : null

  return (
    <Link href={`/admin/bookings/view?id=${booking.id}`} className={`${cardClass} flex items-center gap-3 p-4`}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-base font-bold leading-tight">{booking.service?.name}</span>
          <StatusBadgeFor status={booking.status} />
          {forWho ? <span className={`text-xs font-semibold ${mutedClass}`}>{forWho}</span> : null}
        </div>
        <div className={`mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm ${mutedClass}`}>
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="size-3.5 text-[#C96C83]" aria-hidden />
            {formatBookingDate(booking.starts_at, { weekday: "short", month: "short", day: "numeric" })},{" "}
            {formatBookingTime(booking.starts_at, { hour: "numeric", minute: "2-digit" })}
          </span>
          {booking.employee_profile?.name ? (
            <span className="inline-flex items-center gap-1">
              <UserRound className="size-3.5 text-[#C96C83]" aria-hidden />
              {booking.employee_profile.name}
            </span>
          ) : null}
          <span className="font-bold text-[#14100F]">{formatMoney(booking.total)}</span>
        </div>
        {booking.customer_name ? <p className={`mt-1 text-sm ${mutedClass}`}>For {booking.customer_name}</p> : null}
        {sharedWith.length ? (
          <p className="mt-1 text-xs font-semibold text-[#8a5738]">
            Shared visit with {sharedWith.map((l) => `${l.tech.name ?? "another tech"} (${l.serviceName})`).join(", ")}
          </p>
        ) : null}
        {booking.recurrence_active && booking.recurrence_interval_weeks ? (
          <span className="mt-2 inline-flex items-center gap-1 rounded-md bg-[#C96C83]/12 px-2 py-0.5 text-xs font-bold text-[#b95f76]">
            <Repeat2 className="size-3.5" aria-hidden />
            Every {booking.recurrence_interval_weeks} wk{booking.auto_charge ? " · auto-pay" : ""}
          </span>
        ) : null}
        {booking.notes ? <p className={`mt-1 truncate text-xs ${mutedClass}`}>{booking.notes}</p> : null}
      </div>
      <ChevronRight className="size-5 shrink-0 text-[#14100F]/30" aria-hidden />
    </Link>
  )
}
