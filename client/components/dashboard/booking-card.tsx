import type { ReactNode } from "react"
import { CalendarDays, Repeat2, UserRound } from "lucide-react"

import { StatusBadgeFor } from "@/components/dashboard/status-badge"
import { cn } from "@/lib/utils"
import type { Booking } from "@/lib/hooks/use-bookings"

const STATUS_COLORS: Record<Booking["status"], string> = {
  pending: "#d4a843",
  confirmed: "#c96c83",
  in_progress: "#d4a843",
  completed: "#5a9e5a",
  cancelled: "#8a8d93",
  no_show: "#d4754a",
}

// Who the booking is for, so the tech knows at a glance. Group shows the real
// party size, not a hardcoded number.
function clientTypeLabel(clientType: Booking["client_type"], partySize?: number): string {
  switch (clientType) {
    case "group":
      return `Group of ${partySize && partySize > 1 ? partySize : 2}`
    case "kids":
      return "Kids"
    case "elderly":
      return "Elderly"
    default:
      return "Adult"
  }
}

interface BookingCardProps {
  booking: Booking
  actions?: ReactNode
  className?: string
}

export function BookingCard({ booking, actions, className }: BookingCardProps) {
  const employeeName = [
    booking.employee_profile?.user?.first_name,
    booking.employee_profile?.user?.last_name,
  ]
    .filter(Boolean)
    .join(" ")

  const dateLabel = formatBookingDateTime(booking.starts_at)
  const total = formatCurrency(booking.total)
  const color = STATUS_COLORS[booking.status]

  return (
    <div
      className={cn(
        "relative border border-black/10 bg-white px-4 py-4 shadow-sm shadow-black/[0.03] sm:px-5",
        className
      )}
    >
      <span className="absolute inset-y-0 left-0 w-1" style={{ background: color }} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 pl-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base font-extrabold leading-tight text-[#101217]">
              {booking.service?.name}
            </span>
            <StatusBadgeFor status={booking.status} />
            {booking.client_type ? (
              <span className="inline-flex min-h-6 items-center bg-[#a36f4d]/12 px-2.5 py-1 text-xs font-bold leading-none text-[#8a5738]">
                {clientTypeLabel(booking.client_type, booking.party_size)}
              </span>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs leading-5 text-[#5f6268]">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays aria-hidden="true" className="size-3.5 text-[#c96c83]" />
              {dateLabel}
            </span>
            {employeeName ? (
              <span className="inline-flex items-center gap-1.5">
                <UserRound aria-hidden="true" className="size-3.5 text-[#c96c83]" />
                {employeeName}
              </span>
            ) : null}
            <span className="font-bold text-[#101217]">{total}</span>
          </div>

          {booking.recurrence_active && booking.recurrence_interval_weeks && (
            <span
              className="mt-3 inline-flex min-h-6 items-center gap-1.5 bg-[#c96c83]/12 px-2.5 py-1 text-xs font-bold text-[#b95f76]"
            >
              <Repeat2 aria-hidden="true" className="size-3.5" />
              Every {booking.recurrence_interval_weeks} wk
              {booking.auto_charge ? " · auto-pay" : ""}
            </span>
          )}

          {booking.notes && (
            <p className="mt-3 truncate text-xs leading-5 text-[#5f6268]">{booking.notes}</p>
          )}
        </div>

        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2 pl-2 sm:justify-end">{actions}</div>}
      </div>
    </div>
  )
}

function formatBookingDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Date not available"

  const dateStr = date.toLocaleDateString("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  })
  const timeStr = date.toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit" })
  return `${dateStr} at ${timeStr}`
}

function formatCurrency(value: string | number) {
  const amount = Number(value)
  return Number.isFinite(amount) ? `$${amount.toFixed(2)}` : "-"
}
