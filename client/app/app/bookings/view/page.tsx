"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { CalendarDays, ChevronRight, Clock3, MapPin, ReceiptText, Repeat, User } from "lucide-react"

import { BubbleLoader } from "@/components/bubble-loader"
import { assetUrl } from "@/lib/asset-url"
import { formatBookingDate, formatBookingTime } from "@/lib/booking-time"
import { useBooking } from "@/lib/hooks/use-bookings"
import { paymentMethodLabel } from "@/lib/payment-methods"
import { cardClass, eyebrowClass, mutedClass } from "../../app-theme"
import { EmptyState } from "../../empty-state"
import { SectionScreen } from "../../section-screen"
import { ACTIVE, AppointmentActions, statusStyle } from "../page"

const money = (v: string | number | null | undefined) => `$${Number(v ?? 0).toFixed(2)}`

// One appointment, from the customer's side: when, the actions (message and track
// the tech, join the call, reschedule, cancel, rate), who is coming, where,
// what's being done and what it costs, payment, and their notes. Opened from a
// booking row, a calendar day, or Next appointment on Home.
// useSearchParams needs a Suspense boundary for the static app export.
export default function AppointmentScreen() {
  return (
    <Suspense>
      <Appointment />
    </Suspense>
  )
}

function Appointment() {
  const id = Number(useSearchParams().get("id"))
  const { data: booking, isLoading } = useBooking(id)
  const [now] = useState(() => Date.now())

  if (isLoading) {
    return (
      <SectionScreen title="Appointment">
        <BubbleLoader className="pt-16" label="Loading your appointment" />
      </SectionScreen>
    )
  }
  if (!booking) {
    return (
      <SectionScreen title="Appointment">
        <EmptyState icon={CalendarDays} title="Appointment not found" text="It may have been cancelled. Your bookings are on Home." />
      </SectionScreen>
    )
  }

  const upcoming = ACTIVE.includes(booking.status) && new Date(booking.starts_at).getTime() >= now
  const minutes = Math.round((new Date(booking.ends_at).getTime() - new Date(booking.starts_at).getTime()) / 60000)
  const tech = booking.employee_profile
  const address = booking.address
  const addressText = address ? [address.line1, address.line2, address.city, address.province, address.postal_code].filter(Boolean).join(", ") : null
  const addonsTotal = booking.addons.reduce((s, a) => s + Number(a.price), 0)
  const balance = Number(booking.outstanding_balance)
  const paidSoFar = Number(booking.total) - balance

  return (
    <SectionScreen title="Appointment">
      <div className="space-y-3 pb-6">
        {/* When + what, and what you can do */}
        <section className={`${cardClass} p-4`}>
          <div className="flex items-center justify-between gap-2">
            <span className={`rounded-full px-2.5 py-1 text-[0.8125rem] font-bold uppercase tracking-[0.1em] ${statusStyle(booking.status)}`}>
              {booking.status.replace("_", " ")}
            </span>
            <span className="text-base font-black">{money(booking.total)}</span>
          </div>
          <h2 className="mt-3 text-2xl font-black leading-tight tracking-tight">{booking.service.name}</h2>
          <div className={`mt-2 space-y-1.5 text-sm ${mutedClass}`}>
            <p className="flex items-center gap-2">
              <CalendarDays className="size-4 text-[#C96C83]" aria-hidden />
              {formatBookingDate(booking.starts_at, { weekday: "long", month: "long", day: "numeric" })}
            </p>
            <p className="flex items-center gap-2">
              <Clock3 className="size-4 text-[#C96C83]" aria-hidden />
              {formatBookingTime(booking.starts_at)} – {formatBookingTime(booking.ends_at)} · {minutes} min
            </p>
            {booking.client_type === "group" && booking.party_size > 1 ? (
              <p className="flex items-center gap-2">
                <User className="size-4 text-[#C96C83]" aria-hidden />
                Group of {booking.party_size}
              </p>
            ) : null}
            {booking.recurrence_active && booking.recurrence_interval_weeks ? (
              <p className="flex items-center gap-2">
                <Repeat className="size-4 text-[#C96C83]" aria-hidden />
                Repeats every {booking.recurrence_interval_weeks === 1 ? "week" : `${booking.recurrence_interval_weeks} weeks`}
              </p>
            ) : null}
          </div>
          {booking.status === "cancelled" && booking.cancellation_reason ? (
            <p className="mt-3 rounded-lg bg-black/[0.04] px-3 py-2 text-sm">Cancelled: {booking.cancellation_reason}</p>
          ) : null}
          <AppointmentActions booking={booking} cancellable={upcoming} now={now} />
        </section>

        {/* Who's coming */}
        <section className={`${cardClass} p-4`}>
          <p className={eyebrowClass}>Your technician</p>
          <div className="mt-2 flex items-center gap-3">
            {tech.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={assetUrl(tech.photo_url)} alt="" className="size-12 shrink-0 rounded-full object-cover" />
            ) : (
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[#C96C83]/12 text-lg font-black text-[#9E4A60]">
                {(tech.name ?? "?").charAt(0).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-base font-extrabold">{tech.name ?? "Your technician"}</p>
              {tech.title ? <p className={`truncate text-sm ${mutedClass}`}>{tech.title}</p> : null}
            </div>
          </div>
        </section>

        {/* Where */}
        {addressText ? (
          <section className={`${cardClass} p-4`}>
            <p className={eyebrowClass}>Where</p>
            <p className="mt-2 flex items-start gap-2 text-sm font-semibold">
              <MapPin className="mt-0.5 size-4 shrink-0 text-[#C96C83]" aria-hidden />
              {addressText}
            </p>
            {address?.is_apartment ? (
              <p className={`mt-1 pl-6 text-sm ${mutedClass}`}>
                Apartment{address.line2 ? ` ${address.line2}` : ""}{address.buzz_code ? ` · Buzz ${address.buzz_code}` : ""}
              </p>
            ) : null}
          </section>
        ) : null}

        {/* What's being done, priced */}
        <section className={`${cardClass} p-4`}>
          <p className={eyebrowClass}>Services</p>
          <ul className="mt-2 space-y-2 text-sm">
            <Line label={booking.service.name} hint={`${booking.service.duration_minutes} min`} value={money(Number(booking.subtotal) - addonsTotal)} />
            {booking.addons.map((a) => (
              <Line key={a.id} label={a.name} hint={`Add-on · ${a.duration} min`} value={money(a.price)} />
            ))}
            {Number(booking.travel_fee) > 0 ? <Line label="Travel fee" value={money(booking.travel_fee)} /> : null}
            {Number(booking.overtime_amount) > 0 ? <Line label="Overtime" value={money(booking.overtime_amount)} /> : null}
          </ul>
          <div className="mt-3 flex items-center justify-between border-t border-black/10 pt-3">
            <span className="text-sm font-bold">Total</span>
            <span className="text-base font-black">{money(booking.total)}</span>
          </div>
          <p className={`mt-1 text-sm ${mutedClass}`}>Taxes included.</p>
        </section>

        {/* Payment */}
        {booking.status !== "cancelled" ? (
          <section className={`${cardClass} p-4`}>
            <div className="flex items-center justify-between">
              <p className={eyebrowClass}>Payment</p>
              <span
                className={`rounded-full px-2.5 py-1 text-[0.8125rem] font-bold uppercase tracking-[0.1em] ${
                  balance <= 0 ? "bg-[#4E9A57]/15 text-[#3f7e47]" : "bg-[#C96C83]/12 text-[#9E4A60]"
                }`}
              >
                {balance <= 0 ? "Paid" : "Balance due"}
              </span>
            </div>
            <ul className="mt-2 space-y-2 text-sm">
              <Line
                label="Paid"
                hint={booking.paid_methods.length ? booking.paid_methods.map(paymentMethodLabel).join(" + ") : undefined}
                value={money(paidSoFar)}
              />
              {balance > 0 ? <Line label="Balance due" hint="Paid to your technician on the day" value={money(balance)} /> : null}
            </ul>
            <Link href="/app/transactions" className="mt-3 flex items-center justify-between rounded-lg bg-black/[0.04] px-3 py-2.5 text-sm font-semibold">
              <span className="flex items-center gap-2">
                <ReceiptText className="size-4 text-[#C96C83]" aria-hidden /> Receipts &amp; invoices
              </span>
              <ChevronRight className="size-4 text-[#14100F]/30" aria-hidden />
            </Link>
          </section>
        ) : null}

        {/* Your notes */}
        {booking.notes?.trim() ? (
          <section className="rounded-2xl bg-[#C98A2E]/10 p-4">
            <p className="text-[0.8125rem] font-bold uppercase tracking-[0.16em] text-[#8a5e12]">Your notes</p>
            <p className="mt-1.5 text-sm leading-snug text-[#5c3f0d]">{booking.notes}</p>
          </section>
        ) : null}

        <p className={`px-1 text-sm ${mutedClass}`}>
          Booking #{booking.id} · booked {formatBookingDate(booking.created_at, { month: "short", day: "numeric", year: "numeric" })}
        </p>
      </div>
    </SectionScreen>
  )
}

function Line({ label, hint, value }: { label?: string; hint?: string; value: string }) {
  return (
    <li className="flex items-start justify-between gap-3">
      <span className="min-w-0">
        <span className="block font-semibold">{label}</span>
        {hint ? <span className={`block text-sm ${mutedClass}`}>{hint}</span> : null}
      </span>
      <span className="shrink-0 font-bold">{value}</span>
    </li>
  )
}
