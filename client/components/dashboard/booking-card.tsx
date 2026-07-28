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

const STATUS_LABELS: Record<Booking["status"], string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
}

interface BookingCardProps {
  booking: Booking
  actions?: React.ReactNode
  className?: string
}

export function BookingCard({ booking, actions, className }: BookingCardProps) {
  const employeeName = [
    booking.employee_profile?.user?.first_name,
    booking.employee_profile?.user?.last_name,
  ]
    .filter(Boolean)
    .join(" ")

  const date = new Date(booking.starts_at)
  const dateStr = date.toLocaleDateString("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  })
  const timeStr = date.toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit" })
  const color = STATUS_COLORS[booking.status]

  return (
    <div
      className={cn(
        "rounded-xl border border-black/8 bg-white px-5 py-4 flex items-start gap-4",
        className
      )}
    >
      {/* Status dot */}
      <div className="mt-1 shrink-0">
        <span className="block size-2.5 rounded-full" style={{ background: color }} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-[#101217] text-sm">{booking.service?.name}</span>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: `${color}22`, color }}
          >
            {STATUS_LABELS[booking.status]}
          </span>
          {booking.client_type && booking.client_type !== "adult" && (
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium capitalize"
              style={{ background: "#a36f4d22", color: "#a36f4d" }}
            >
              {booking.client_type === "group" ? "Group (5)" : booking.client_type}
            </span>
          )}
          {booking.recurrence_active && booking.recurrence_interval_weeks && (
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1"
              style={{ background: "#c96c8322", color: "#c96c83" }}
            >
              ↻ Every {booking.recurrence_interval_weeks} wk
              {booking.auto_charge ? " · auto-pay" : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-[#5f6268] flex-wrap">
          <span>{dateStr} · {timeStr}</span>
          {employeeName && <span>with {employeeName}</span>}
          <span className="font-semibold text-[#101217]">${booking.total}</span>
        </div>
        {booking.notes && (
          <p className="mt-1.5 text-xs text-[#5f6268] truncate">{booking.notes}</p>
        )}
      </div>

      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  )
}
