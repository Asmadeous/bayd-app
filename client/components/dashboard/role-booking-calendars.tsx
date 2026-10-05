"use client"

import { useMemo, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { X } from "lucide-react"

import { AdminBookingActions } from "@/components/dashboard/admin-booking-actions"
import { BookingCalendar, type CalendarSlot } from "@/components/dashboard/booking-calendar"
import { CancelBookingButton } from "@/components/dashboard/cancel-booking-button"
import { MessageTechButton } from "@/components/dashboard/message-tech-button"
import { RescheduleDialog } from "@/components/dashboard/reschedule-dialog"
import { StaffBookingActions } from "@/components/dashboard/staff-booking-actions"
import { StatusBadgeFor } from "@/components/dashboard/status-badge"
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useToast } from "@/components/bayd-toast-provider"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { bookingLocalMinutes, formatBookingDate, formatBookingTime, formatDateKey } from "@/lib/booking-time"
import {
  useAdminBookableWindows,
  useAdminBookingsRange,
  useAdminEmployees,
  useAdminRescheduleBooking,
} from "@/lib/hooks/use-admin"
import { useBookingsRange, type Booking } from "@/lib/hooks/use-bookings"
import { useCalendarState } from "@/lib/hooks/use-calendar-state"
import { useEmployeeScheduleRange } from "@/lib/hooks/use-employee"
import { paymentMethodLabel } from "@/lib/payment-methods"

// One calendar per role. Each loads exactly the visible range, opens a detail
// sheet with that role's existing actions, and sends empty future slots to that
// role's create flow. Staff get no reschedule/cancel (admin decision).

export function CustomerBookingCalendar() {
  const router = useRouter()
  const state = useCalendarState()
  const query = useBookingsRange(state.from, state.to)
  return (
    <RoleCalendar
      state={state}
      query={query}
      who="tech"
      onSelectSlot={({ date }) => router.push(`/dashboard/customer/book?date=${date}`)}
      actions={(b) =>
        b.status === "pending" || b.status === "confirmed" ? (
          <>
            <MessageTechButton booking={b} />
            <RescheduleDialog booking={b} />
            <CancelBookingButton booking={b} />
          </>
        ) : null
      }
    />
  )
}

export function StaffBookingCalendar() {
  const router = useRouter()
  const state = useCalendarState()
  const query = useEmployeeScheduleRange(state.from, state.to)
  return (
    <RoleCalendar
      state={state}
      query={query}
      who="client"
      onSelectSlot={({ date, time }) =>
        router.push(`/dashboard/employee/new-booking?date=${date}${time ? `&time=${time}` : ""}`)
      }
      actions={(b) => (b.status === "cancelled" ? null : <StaffBookingActions booking={b} />)}
    />
  )
}

// Admin: every tech, filterable. Dragging a pending/confirmed booking to another
// time (or day, keeping its time) reschedules it through the same endpoint as
// the reschedule dialog, after a confirm. Filtering to one tech shades the hours
// they can't be booked (their schedule + blackouts).
export function AdminBookingCalendar() {
  const router = useRouter()
  const { toast } = useToast()
  const state = useCalendarState()
  const [employeeId, setEmployeeId] = useState<number | undefined>()
  const [move, setMove] = useState<{ booking: Booking; startsAt: string; label: string } | null>(null)
  const query = useAdminBookingsRange(state.from, state.to, employeeId)
  const { data: employees } = useAdminEmployees()
  const { data: windows } = useAdminBookableWindows(employeeId, state.from, state.to)
  const reschedule = useAdminRescheduleBooking()

  function requestMove(booking: Booking, slot: CalendarSlot) {
    const minutes = bookingLocalMinutes(booking.starts_at)
    const time = slot.time ?? `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`
    const label = `${formatDateKey(slot.date, { weekday: "long", month: "long", day: "numeric" })} at ${formatClock(time)}`
    setMove({ booking, startsAt: `${slot.date}T${time}:00`, label })
  }

  function confirmMove() {
    if (!move) return
    reschedule.mutate(
      { id: move.booking.id, starts_at: move.startsAt },
      {
        onSuccess: () => {
          toast({ title: "Booking moved", description: `${move.booking.service?.name} is now ${move.label}.`, variant: "success" })
          setMove(null)
        },
        onError: (error: unknown) => {
          const data = (error as { response?: { data?: { error?: string } } })?.response?.data
          toast({ title: "Booking not moved", description: data?.error ?? "That time isn't available.", variant: "error" })
          setMove(null)
        },
      },
    )
  }

  return (
    <>
      <RoleCalendar
        state={state}
        query={query}
        who="both"
        availability={employeeId ? windows : undefined}
        onMoveBooking={requestMove}
        canMove={(b) => b.status === "pending" || b.status === "confirmed"}
        onSelectSlot={({ date, time }) => {
          const params = new URLSearchParams({ date })
          if (time) params.set("time", time)
          if (employeeId) params.set("employee_id", String(employeeId))
          router.push(`/dashboard/admin/bookings/new?${params}`)
        }}
        actions={(b) => <AdminBookingActions booking={b} />}
        toolbar={
          <select
            aria-label="Filter by technician"
            value={employeeId ?? ""}
            onChange={(e) => setEmployeeId(e.target.value ? Number(e.target.value) : undefined)}
            className="h-9 border border-black/10 bg-white px-2 text-xs font-bold text-[#101217]"
          >
            <option value="">All technicians</option>
            {(employees?.data ?? []).map((ep) => (
              <option key={ep.id} value={ep.id}>
                {ep.name ?? `Tech #${ep.id}`}
              </option>
            ))}
          </select>
        }
      />
      <Dialog open={move !== null} onOpenChange={(open) => { if (!open) setMove(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Move this booking?</DialogTitle>
            <DialogDescription>
              {move ? `${move.booking.service?.name} for ${move.booking.customer_name ?? "the client"} moves to ${move.label}. The client and technician are notified.` : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <p className="text-xs text-[#5f6268]">
              Business hours, travel time, and double-booking are checked; if the new time doesn&apos;t work, nothing changes.
            </p>
          </DialogBody>
          <DialogFooter>
            <Button size="sm" onClick={confirmMove} disabled={reschedule.isPending}>
              {reschedule.isPending ? "Moving..." : "Move booking"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setMove(null)}>
              Keep it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function formatClock(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number)
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`
}

function RoleCalendar({
  state,
  query,
  who,
  onSelectSlot,
  actions,
  toolbar,
  availability,
  onMoveBooking,
  canMove,
}: {
  state: ReturnType<typeof useCalendarState>
  query: { data?: Booking[]; isLoading: boolean; isFetching: boolean; isError: boolean }
  who: "client" | "tech" | "both"
  onSelectSlot: (slot: CalendarSlot) => void
  actions: (booking: Booking) => ReactNode
  toolbar?: ReactNode
  availability?: Record<string, { start: string; end: string }[]>
  onMoveBooking?: (booking: Booking, slot: CalendarSlot) => void
  canMove?: (booking: Booking) => boolean
}) {
  const [showCancelled, setShowCancelled] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const all = useMemo(() => query.data ?? [], [query.data])
  const visible = useMemo(
    () => (showCancelled ? all : all.filter((b) => b.status !== "cancelled")),
    [all, showCancelled],
  )
  // Look the open booking up in fresh data so the sheet reflects any action taken.
  const selected = all.find((b) => b.id === selectedId) ?? null

  return (
    <>
      <BookingCalendar
        state={state}
        bookings={visible}
        isLoading={query.isLoading || query.isFetching}
        isError={query.isError}
        who={who}
        onSelectBooking={(b) => setSelectedId(b.id)}
        onSelectSlot={onSelectSlot}
        availability={availability}
        onMoveBooking={onMoveBooking}
        canMove={canMove}
        toolbar={
          <>
            {toolbar}
            <label className="flex h-9 cursor-pointer items-center gap-2 border border-black/10 bg-white px-2 text-xs font-bold text-[#5f6268]">
              <input
                type="checkbox"
                checked={showCancelled}
                onChange={(e) => setShowCancelled(e.target.checked)}
                className="size-3.5 accent-[#c96c83]"
              />
              Show cancelled
            </label>
          </>
        }
      />
      <BookingDetailSheet booking={selected} who={who} onClose={() => setSelectedId(null)} actions={selected ? actions(selected) : null} />
    </>
  )
}

function BookingDetailSheet({
  booking,
  who,
  onClose,
  actions,
}: {
  booking: Booking | null
  who: "client" | "tech" | "both"
  onClose: () => void
  actions: ReactNode
}) {
  if (!booking) return null
  const addr = booking.address
  const address = addr ? [addr.line1, addr.line2, addr.city, addr.postal_code].filter(Boolean).join(", ") : null
  const due = Number(booking.outstanding_balance)
  const rows: { label: string; value: ReactNode }[] = [
    {
      label: "When",
      value: `${formatBookingDate(booking.starts_at, { weekday: "long", month: "long", day: "numeric" })}, ${formatBookingTime(booking.starts_at)} - ${formatBookingTime(booking.ends_at)}`,
    },
  ]
  if (who !== "tech" && booking.customer_name) rows.push({ label: "Client", value: booking.customer_name })
  if (who !== "tech" && booking.booked_for_phone) {
    rows.push({ label: "Phone", value: <a className="text-[#c96c83] hover:underline" href={`tel:${booking.booked_for_phone}`}>{booking.booked_for_phone}</a> })
  }
  if (who !== "client" && booking.employee_profile?.name) rows.push({ label: "Technician", value: booking.employee_profile.name })
  if (address) rows.push({ label: "Address", value: address })
  if (booking.addons?.length) rows.push({ label: "Add-ons", value: booking.addons.map((a) => a.name).join(", ") })
  rows.push({
    label: "Total",
    value: `$${Number(booking.total).toFixed(2)}${due > 0 ? ` · $${due.toFixed(2)} due` : booking.paid_methods?.length ? ` · paid by ${booking.paid_methods.map(paymentMethodLabel).join(" + ")}` : ""}`,
  })
  if (booking.notes) rows.push({ label: "Notes", value: booking.notes })
  if (booking.status === "cancelled" && booking.cancellation_reason) {
    rows.push({ label: "Cancelled because", value: booking.cancellation_reason })
  }

  return (
    <Sheet open onOpenChange={(open) => { if (!open) onClose() }}>
      <SheetContent>
        <SheetHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a36f4d]">Appointment</p>
              <SheetTitle className="text-xl font-extrabold leading-tight text-[#101217]">{booking.service?.name}</SheetTitle>
            </div>
            <button type="button" onClick={onClose} aria-label="Close" className="p-1 text-[#5f6268] hover:text-[#101217]">
              <X className="size-5" aria-hidden />
            </button>
          </div>
          <StatusBadgeFor status={booking.status} className="mt-2 w-fit" />
        </SheetHeader>
        <SheetBody className="space-y-5">
          <dl className="space-y-3">
            {rows.map((r) => (
              <div key={r.label}>
                <dt className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[#6b6f76]">{r.label}</dt>
                <dd className="mt-0.5 text-sm text-[#101217]">{r.value}</dd>
              </div>
            ))}
          </dl>
          {actions ? <div className="flex flex-wrap items-center gap-2 border-t border-black/8 pt-4">{actions}</div> : null}
        </SheetBody>
      </SheetContent>
    </Sheet>
  )
}
