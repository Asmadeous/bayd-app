"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CalendarDays, Clock3, MapPin, Repeat, Route, User } from "lucide-react"

import { BubbleLoader } from "@/components/bubble-loader"
import { useBookingAccess } from "@/lib/booking-access"
import { formatBookingDate, formatBookingTime } from "@/lib/booking-time"
import { useEmployeeBooking, type EmployeeJob } from "@/lib/hooks/use-employee"
import { paymentMethodLabel } from "@/lib/payment-methods"
import { JobActions } from "../../staff-booking-card"
import { StaffHeader } from "../../staff-header"
import { bookingStatusStyle, cardClass, eyebrowClass, mutedClass, staffScreenClass } from "../../staff-theme"

const money = (v: string | number | null | undefined) => `$${Number(v ?? 0).toFixed(2)}`

const PAYMENT: Record<string, { label: string; style: string }> = {
  paid: { label: "Paid", style: "bg-[#4E9A57]/15 text-[#3f7e47]" },
  deposit_paid: { label: "Deposit paid", style: "bg-[#D4A843]/15 text-[#8a6a1f]" },
  refunded: { label: "Refunded", style: "bg-black/[0.06] text-[#14100F]/60" },
  unpaid: { label: "Unpaid", style: "bg-[#8f3f4b]/12 text-[#8f3f4b]" },
}

// One job, everything the tech needs for it: when, what to do next, who the
// client is, where, what's being done and charged, the
// payment state, notes, and the clock record. Opened from a Schedule row or a
// calendar block. useSearchParams needs a Suspense boundary for the static export.
export default function StaffJobScreen() {
  return (
    <Suspense>
      <StaffJob />
    </Suspense>
  )
}

function StaffJob() {
  const id = Number(useSearchParams().get("id"))
  const { data: job, isLoading } = useEmployeeBooking(id)
  const [now] = useState(() => Date.now())

  return (
    <div className={staffScreenClass}>
      <StaffHeader back title="Job" />
      <div className="space-y-3 px-5 pb-6">
        {isLoading ? (
          <BubbleLoader className="pt-16" label="Loading the job" />
        ) : !job ? (
          <div className={`${cardClass} p-8 text-center`}>
            <p className="font-bold">Job not found</p>
            <p className={`mt-1 text-sm ${mutedClass}`}>It may have been reassigned.</p>
          </div>
        ) : (
          <JobDetails
            job={job}
            // Time passed and nobody clocked in: a record, no clock in / navigate.
            history={["pending", "confirmed"].includes(job.status) && new Date(job.ends_at).getTime() < now}
          />
        )}
      </div>
    </div>
  )
}

function JobDetails({ job, history }: { job: EmployeeJob; history: boolean }) {
  const minutes = Math.round((new Date(job.ends_at).getTime() - new Date(job.starts_at).getTime()) / 60000)
  const client = job.client
  const bookedFor = job.booked_for_name && job.booked_for_name !== client?.name ? job.booked_for_name : null
  const address = job.address
  const addressText = address ? [address.line1, address.line2, address.city, address.province, address.postal_code].filter(Boolean).join(", ") : null
  const notes = job.notes?.split(" — ").filter((n) => !n.startsWith("Booked by")).join(" ").trim()
  const bookedBy = job.notes?.split(" — ").find((n) => n.startsWith("Booked by"))
  const payment = PAYMENT[job.payment_status ?? "unpaid"] ?? PAYMENT.unpaid
  const financials = job.financials

  return (
    <>
      {/* When + what, and the next thing to do */}
      <section className={`${cardClass} p-4`}>
        <div className="flex items-center justify-between gap-2">
          <span className={`rounded-full px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-[0.08em] ${bookingStatusStyle(job.status)}`}>
            {job.status.replace("_", " ")}
          </span>
          <span className="text-base font-black">{money(job.total)}</span>
        </div>
        <h2 className="mt-3 text-2xl font-black leading-tight tracking-tight">{job.service?.name}</h2>
        <div className={`mt-2 space-y-1.5 text-sm ${mutedClass}`}>
          <p className="flex items-center gap-2">
            <CalendarDays className="size-4 text-[#C96C83]" aria-hidden />
            {formatBookingDate(job.starts_at, { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <p className="flex items-center gap-2">
            <Clock3 className="size-4 text-[#C96C83]" aria-hidden />
            {formatBookingTime(job.starts_at)} – {formatBookingTime(job.ends_at)} · {minutes} min
          </p>
          {job.client_type !== "adult" ? (
            <p className="flex items-center gap-2">
              <User className="size-4 text-[#C96C83]" aria-hidden />
              {job.client_type === "group" ? `Group of ${job.party_size}` : job.client_type === "kids" ? "Child" : "Elderly client"}
            </p>
          ) : null}
          {job.recurrence_active && job.recurrence_interval_weeks ? (
            <p className="flex items-center gap-2">
              <Repeat className="size-4 text-[#C96C83]" aria-hidden />
              Repeats every {job.recurrence_interval_weeks === 1 ? "week" : `${job.recurrence_interval_weeks} weeks`}
            </p>
          ) : null}
        </div>
        <JobActions booking={job} history={history} showFinancials={false} clientUserId={job.client?.user_id} />
      </section>

      {/* Who */}
      <section className={`${cardClass} p-4`}>
        <p className={eyebrowClass}>Client</p>
        <div className="mt-2 flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#C96C83]/12 text-base font-black text-[#9E4A60]">
            {(client?.name ?? job.customer_name ?? "?").charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-extrabold">{client?.name ?? job.customer_name ?? "Client"}</p>
            <p className={`text-sm ${mutedClass}`}>
              {client ? (client.completed_visits === 0 ? "First visit" : `${client.completed_visits} previous visit${client.completed_visits === 1 ? "" : "s"}`) : ""}
            </p>
          </div>
        </div>
        {bookedFor ? (
          <p className="mt-3 rounded-lg bg-black/[0.04] px-3 py-2 text-sm">
            Booked for <span className="font-bold">{bookedFor}</span>
          </p>
        ) : null}
      </section>

      {/* Where */}
      {addressText ? (
        <section className={`${cardClass} p-4`}>
          <p className={eyebrowClass}>Location</p>
          <p className="mt-2 flex items-start gap-2 text-sm font-semibold">
            <MapPin className="mt-0.5 size-4 shrink-0 text-[#C96C83]" aria-hidden />
            {addressText}
          </p>
          {address?.is_apartment ? (
            <p className={`mt-1 pl-6 text-sm ${mutedClass}`}>
              Apartment{address.line2 ? ` ${address.line2}` : ""}{address.buzz_code ? ` · Buzz ${address.buzz_code}` : ""}
            </p>
          ) : null}
          <LocationNavigate job={job} history={history} />
        </section>
      ) : null}

      {/* What's being done, priced */}
      <section className={`${cardClass} p-4`}>
        <p className={eyebrowClass}>Services</p>
        <ul className="mt-2 space-y-2 text-sm">
          <Line label={job.service?.name} hint={`${job.service?.duration_minutes} min`} value={money(Number(job.subtotal) - job.addons.reduce((s, a) => s + Number(a.price), 0))} />
          {job.addons.map((a) => (
            <Line key={a.id} label={a.name} hint={`Add-on · ${a.duration} min`} value={money(a.price)} />
          ))}
          {Number(job.travel_fee) > 0 ? <Line label="Travel fee" value={money(job.travel_fee)} /> : null}
          {Number(job.overtime_amount) > 0 ? <Line label="Overtime" value={money(job.overtime_amount)} /> : null}
        </ul>
        <div className="mt-3 flex items-center justify-between border-t border-black/10 pt-3">
          <span className="text-sm font-bold">Total</span>
          <span className="text-base font-black">{money(job.total)}</span>
        </div>
      </section>

      {/* Money */}
      <section className={`${cardClass} p-4`}>
        <div className="flex items-center justify-between">
          <p className={eyebrowClass}>Payment</p>
          <span className={`rounded-full px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-[0.08em] ${payment.style}`}>{payment.label}</span>
        </div>
        <ul className="mt-2 space-y-2 text-sm">
          <Line label="Paid" hint={job.paid_methods.length ? job.paid_methods.map(paymentMethodLabel).join(" + ") : undefined} value={money(financials?.amount_paid)} />
          <Line label="Balance due" value={money(job.outstanding_balance)} strong={Number(job.outstanding_balance) > 0} />
          {financials?.account_type === "direct" && Number(financials.tips) > 0 ? <Line label="Tips" value={money(financials.tips)} /> : null}
          {financials?.account_type === "partner" ? <Line label="Your share" value={money(financials.provider_share)} /> : null}
        </ul>
      </section>

      {/* What the client asked for */}
      {notes ? (
        <section className="rounded-2xl bg-[#C98A2E]/10 p-4">
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[#8a5e12]">Notes from the client</p>
          <p className="mt-1.5 text-sm leading-snug text-[#5c3f0d]">{notes}</p>
        </section>
      ) : null}

      {/* Clock record */}
      {job.visit ? (
        <section className={`${cardClass} p-4`}>
          <p className={eyebrowClass}>Visit log</p>
          <ul className="mt-2 space-y-2 text-sm">
            <Line label="Clocked in" value={job.visit.clock_in_at ? formatBookingTime(job.visit.clock_in_at) : "-"} />
            <Line label="Clocked out" value={job.visit.clock_out_at ? formatBookingTime(job.visit.clock_out_at) : "Still in service"} />
            <Line label="Distance driven" value={`${Number(job.visit.distance_km ?? 0).toFixed(1)} km`} />
          </ul>
        </section>
      ) : null}

      <p className={`px-1 text-xs ${mutedClass}`}>
        Booking #{job.id} · booked {formatBookingDate(job.created_at, { month: "short", day: "numeric", year: "numeric" })}
        {bookedBy ? ` · ${bookedBy}` : ""}
      </p>
    </>
  )
}

function Line({ label, hint, value, strong }: { label?: string; hint?: string; value: string; strong?: boolean }) {
  return (
    <li className="flex items-start justify-between gap-3">
      <span className="min-w-0">
        <span className="block font-semibold">{label}</span>
        {hint ? <span className={`block text-xs ${mutedClass}`}>{hint}</span> : null}
      </span>
      <span className={`shrink-0 ${strong ? "font-black text-[#8f3f4b]" : "font-bold"}`}>{value}</span>
    </li>
  )
}

// In-app navigation to the client, under the same 30-minute rule as clock in.
function LocationNavigate({ job, history }: { job: EmployeeJob; history: boolean }) {
  const router = useRouter()
  const access = useBookingAccess(job)
  const active = !history && ["confirmed", "in_progress"].includes(job.status)
  if (!active || !job.service_latitude || !job.service_longitude) return null

  return access.open ? (
    <button
      type="button"
      onClick={() => router.push(`/staff/schedule/navigate?id=${job.id}`)}
      className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-[#C96C83]/10 py-2.5 text-sm font-bold text-[#9E4A60]"
    >
      <Route className="size-4" aria-hidden /> Navigate
    </button>
  ) : (
    <p className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-black/[0.04] py-2.5 text-sm font-semibold text-[#14100F]/55">
      <Route className="size-4" aria-hidden /> Navigation opens {access.opensLabel}
    </p>
  )
}
