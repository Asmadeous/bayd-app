"use client"

import { Suspense, type ReactNode } from "react"
import { useSearchParams } from "next/navigation"

import { AdminBookingActions } from "@/components/dashboard/admin-booking-actions"
import { StatusBadgeFor } from "@/components/dashboard/status-badge"
import { useAdminBooking } from "@/lib/hooks/use-admin"
import { formatBookingDate, formatBookingTime } from "@/lib/booking-time"
import { paymentMethodLabel } from "@/lib/payment-methods"
import { formatMoney } from "@/lib/stores/franchise-store"
import { isVisit, visitLines } from "@/lib/visits"
import { AdminHeader } from "../../admin-header"
import { adminScreenClass, cardClass, displayClass, eyebrowClass, mutedClass } from "../../admin-theme"

export default function AdminBookingScreen() {
  // useSearchParams needs a Suspense boundary for the static export.
  return (
    <Suspense>
      <BookingDetail />
    </Suspense>
  )
}

// One booking: the same details the web calendar's sheet shows, then the web
// booking card's actions (reassign, reschedule, start, complete, collect
// payment, cancel, and the visit's own actions).
function BookingDetail() {
  const id = Number(useSearchParams().get("id"))
  const { data: booking, isLoading } = useAdminBooking(id)

  if (isLoading || !booking) {
    return (
      <div className={adminScreenClass}>
        <AdminHeader back title="Booking" />
        <p className={`px-5 text-sm ${mutedClass}`}>{isLoading ? "Loading…" : "Booking not found."}</p>
      </div>
    )
  }

  const addr = booking.address
  const address = addr ? [addr.line1, addr.line2, addr.city, addr.postal_code].filter(Boolean).join(", ") : null
  const due = Number(booking.outstanding_balance)
  const others = isVisit(booking) ? visitLines(booking).filter((l) => l.bookingId !== booking.id) : []

  const rows: { label: string; value: ReactNode }[] = [
    {
      label: "When",
      value: `${formatBookingDate(booking.starts_at, { weekday: "long", month: "long", day: "numeric" })}, ${formatBookingTime(booking.starts_at)} - ${formatBookingTime(booking.ends_at)}`,
    },
  ]
  if (booking.customer_name) rows.push({ label: "Client", value: booking.customer_name })
  if (booking.booked_for_phone) {
    rows.push({ label: "Phone", value: <a className="font-semibold text-[#C96C83]" href={`tel:${booking.booked_for_phone}`}>{booking.booked_for_phone}</a> })
  }
  if (booking.employee_profile?.name) rows.push({ label: "Technician", value: booking.employee_profile.name })
  if (address) rows.push({ label: "Address", value: address })
  if (booking.addons?.length) rows.push({ label: "Add-ons", value: booking.addons.map((a) => a.name).join(", ") })
  rows.push({
    label: "Total",
    value: `${formatMoney(booking.total)}${
      due > 0 ? ` · ${formatMoney(due)} due` : booking.paid_methods?.length ? ` · paid by ${booking.paid_methods.map(paymentMethodLabel).join(" + ")}` : ""
    }`,
  })
  if (booking.notes) rows.push({ label: "Notes", value: booking.notes })
  if (booking.status === "cancelled" && booking.cancellation_reason) rows.push({ label: "Cancelled because", value: booking.cancellation_reason })

  return (
    <div className={adminScreenClass}>
      <AdminHeader back title="Booking" />
      <div className="space-y-4 px-5">
        <section className={`${cardClass} p-5`}>
          <p className={`${displayClass} text-2xl leading-tight`}>{booking.service?.name}</p>
          <StatusBadgeFor status={booking.status} className="mt-2 w-fit" />
          <dl className="mt-4 space-y-3">
            {rows.map((r) => (
              <div key={r.label}>
                <dt className={eyebrowClass}>{r.label}</dt>
                <dd className="mt-0.5 text-base">{r.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {others.length ? (
          <section className={`${cardClass} p-5`}>
            <p className={eyebrowClass}>Same visit</p>
            <ul className="mt-2 space-y-2">
              {others.map((l) => (
                <li key={l.bookingId} className="text-base">
                  <span className="font-bold">{l.serviceName}</span>
                  <span className={mutedClass}>
                    {" · "}
                    {formatBookingTime(l.startsAt, { hour: "numeric", minute: "2-digit" })}
                    {l.tech.name ? ` · with ${l.tech.name}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className={`${cardClass} p-5`}>
          <p className={eyebrowClass}>Actions</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <AdminBookingActions booking={booking} />
          </div>
        </section>
      </div>
    </div>
  )
}
