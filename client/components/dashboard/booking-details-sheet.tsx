"use client"

import Link from "next/link"

import { StatusBadgeFor } from "@/components/dashboard/status-badge"
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { formatBookingDateTime, formatBookingTime } from "@/lib/booking-time"
import { useVisit, type Booking } from "@/lib/hooks/use-bookings"
import { isVisit, visitEnd, visitLines, visitStart, visitTitle } from "@/lib/visits"
import { formatMoney } from "@/lib/stores/franchise-store"

const money = (value: string | number | null | undefined) => formatMoney(value)

function minutesBetween(start: string, end: string) {
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000)
}

// Everything about one appointment on the customer's dashboard: when, who,
// where, what was booked and what's been paid. Actions (message, reschedule,
// cancel, review) come from the list row and are passed in.
export function BookingDetailsSheet({
  booking,
  actions,
  onClose,
}: {
  booking: Booking | null
  actions?: React.ReactNode
  onClose: () => void
}) {
  const address = booking?.address
  // A multi-service visit shows every service, its tech, and the visit's money.
  const wholeVisit = booking != null && isVisit(booking)
  const { data: visit } = useVisit(wholeVisit ? booking?.visit_id : null)
  const paid = booking ? Number(booking.total) - Number(booking.outstanding_balance) : 0
  // The subtotal already includes add-ons (AddonBooker folds them in).
  const servicePrice = booking
    ? Number(booking.subtotal) - booking.addons.reduce((sum, addon) => sum + Number(addon.price), 0)
    : 0

  return (
    <Sheet open={booking != null} onOpenChange={(open) => !open && onClose()} swipeDirection="right">
      <SheetContent>
        <SheetHeader>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a36f4d]">Appointment #{booking?.id}</p>
          <SheetTitle className="text-xl font-extrabold leading-tight text-[#101217]">
            {booking && wholeVisit ? visitTitle(booking) : booking?.service?.name}
          </SheetTitle>
          <SheetDescription className="text-sm leading-6 text-[#5f6268]">
            {booking
              ? wholeVisit
                ? `${formatBookingDateTime(visitStart(booking))} · ${minutesBetween(visitStart(booking), visitEnd(booking))} min`
                : `${formatBookingDateTime(booking.starts_at)} · ${minutesBetween(booking.starts_at, booking.ends_at)} min`
              : ""}
          </SheetDescription>
        </SheetHeader>

        {booking ? (
          <SheetBody className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadgeFor status={booking.status} />
              {booking.recurrence_active && booking.recurrence_interval_weeks ? (
                <span className="text-xs font-semibold text-[#5f6268]">
                  Repeats every {booking.recurrence_interval_weeks} week{booking.recurrence_interval_weeks === 1 ? "" : "s"}
                </span>
              ) : null}
            </div>
            {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}

            <dl className="divide-y divide-black/8 border border-black/8 text-sm">
              {wholeVisit ? (
              <Row label="Technicians">
                <ul className="space-y-2">
                  {visitLines(booking).map((l) => (
                    <li key={l.bookingId} className="flex items-center gap-2">
                      {l.tech.photoUrl ? (
                        <span
                          aria-hidden
                          className="size-7 shrink-0 rounded-full bg-cover bg-center"
                          style={{ backgroundImage: `url(${l.tech.photoUrl})` }}
                        />
                      ) : null}
                      <span>
                        <span className="font-bold">{l.tech.name ?? "Being assigned"}</span>
                        <span className="text-[#5f6268]">
                          {" "}· {l.serviceName} · {formatBookingTime(l.startsAt, { hour: "numeric", minute: "2-digit" })}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </Row>
              ) : (
              <Row label="Technician">
                <span className="flex items-center gap-2">
                  {booking.employee_profile?.photo_url ? (
                    <span
                      aria-hidden
                      className="size-7 shrink-0 rounded-full bg-cover bg-center"
                      style={{ backgroundImage: `url(${booking.employee_profile.photo_url})` }}
                    />
                  ) : null}
                  {booking.employee_profile?.name ?? "Being assigned"}
                  {booking.employee_profile?.title ? (
                    <span className="text-[#5f6268]">· {booking.employee_profile.title}</span>
                  ) : null}
                </span>
              </Row>
              )}
              <Row label="Where">
                {address ? (
                  <>
                    {address.line1}
                    {address.line2 ? `, ${address.is_apartment ? "Unit " : ""}${address.line2}` : ""}
                    <br />
                    {address.city}, {address.province} {address.postal_code}
                    {address.buzz_code ? <span className="block text-[#5f6268]">Buzzer {address.buzz_code}</span> : null}
                  </>
                ) : (
                  "-"
                )}
              </Row>
              {booking.client_type === "group" ? <Row label="Group">{booking.party_size} people</Row> : null}
              {booking.notes ? <Row label="Your notes">{booking.notes}</Row> : null}
              {booking.cancellation_reason ? <Row label="Cancelled because">{booking.cancellation_reason}</Row> : null}
            </dl>

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#a36f4d]">What you booked</p>
              {wholeVisit ? (
              <dl className="divide-y divide-black/8 border border-black/8 text-sm">
                {visitLines(booking).map((l) => (
                  <Line key={l.bookingId} label={l.serviceName} amount={l.total} />
                ))}
                <Line label="Total" amount={visit?.total ?? visitLines(booking).reduce((sum, l) => sum + l.total, 0)} strong />
                {visit ? <Line label="Paid" amount={visit.amount_paid} /> : null}
                {visit && Number(visit.outstanding_balance) > 0 ? (
                  <Line label="Still to pay" amount={visit.outstanding_balance} strong />
                ) : null}
              </dl>
              ) : (
              <dl className="divide-y divide-black/8 border border-black/8 text-sm">
                <Line label={booking.service?.name ?? "Service"} amount={servicePrice} />
                {booking.addons.map((addon) => (
                  <Line key={addon.id} label={`+ ${addon.name}`} amount={addon.price} />
                ))}
                {Number(booking.travel_fee) > 0 ? <Line label="Travel fee" amount={booking.travel_fee} /> : null}
                {Number(booking.overtime_amount) > 0 ? <Line label="Extra time" amount={booking.overtime_amount} /> : null}
                <Line label="Total" amount={booking.total} strong />
                <Line label="Paid" amount={paid} />
                {Number(booking.outstanding_balance) > 0 ? (
                  <Line label="Still to pay" amount={booking.outstanding_balance} strong />
                ) : null}
              </dl>
              )}
              <Link
                href="/dashboard/customer/transactions"
                className="mt-2 inline-block text-xs font-semibold text-[#c96c83] hover:underline"
              >
                Receipts and invoices →
              </Link>
            </div>
          </SheetBody>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 bg-white px-3 py-3 sm:grid-cols-[120px_1fr]">
      <dt className="text-xs font-bold text-[#5f6268]">{label}</dt>
      <dd className="break-words text-[#101217]">{children}</dd>
    </div>
  )
}

function Line({ label, amount, strong }: { label: string; amount: string | number; strong?: boolean }) {
  return (
    <div className={`flex items-center justify-between bg-white px-3 py-2.5 ${strong ? "font-extrabold" : ""}`}>
      <dt className="text-[#101217]">{label}</dt>
      <dd className="text-[#101217]">{money(amount)}</dd>
    </div>
  )
}
