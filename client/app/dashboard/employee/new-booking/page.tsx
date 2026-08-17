"use client"

import { useState } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { CheckCircle2, ChevronLeft } from "lucide-react"

import { DashboardPage } from "@/components/dashboard/dashboard-page"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardPanel } from "@/components/dashboard/dashboard-panel"
import { Button } from "@/components/ui/button"
import api from "@/lib/api"
import { useCreateStaffBooking, type StaffBookingInput } from "@/lib/hooks/use-employee"

interface ApiService {
  id: number
  name: string
  duration_minutes: number
  price: string
  category_name: string | null
}

const PROVINCES = ["AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT"]
const CLIENT_TYPES = ["adult", "kids", "elderly", "group"]
const inputClass =
  "h-10 w-full border border-black/15 bg-white px-3 text-sm text-[#101217] outline-none transition focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20"
const labelClass = "mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-[#6b6f76]"

export default function StaffNewBookingPage() {
  const { data: services = [] } = useQuery<ApiService[]>({
    queryKey: ["public-services"],
    queryFn: () => api.get<ApiService[]>("/services").then((r) => r.data),
  })
  const createBooking = useCreateStaffBooking()

  const [serviceId, setServiceId] = useState("")
  const [clientType, setClientType] = useState("adult")
  const [partySize, setPartySize] = useState(2)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [date, setDate] = useState("")
  const [time, setTime] = useState("10:00")
  const [line1, setLine1] = useState("")
  const [city, setCity] = useState("")
  const [province, setProvince] = useState("ON")
  const [postal, setPostal] = useState("")
  const [notes, setNotes] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const canSubmit =
    !!serviceId && emailValid && !!name.trim() && !!date && !!time && !!line1.trim() && !!city.trim() && !!postal.trim()

  function submit() {
    setError(null)
    const input: StaffBookingInput = {
      service_id: Number(serviceId),
      starts_at: `${date}T${time}:00`,
      customer: { email: email.trim(), first_name: name.trim() || undefined, phone: phone.trim() || undefined },
      client_type: clientType,
      party_size: clientType === "group" ? partySize : 1,
      address: {
        line1: line1.trim(),
        city: city.trim(),
        province,
        postal_code: postal.trim(),
      },
      notes: notes.trim() || undefined,
    }
    createBooking.mutate(input, {
      onSuccess: () => setDone(true),
      onError: (e: unknown) => {
        const res = (e as { response?: { data?: { error?: string } } })?.response
        setError(res?.data?.error ?? "Couldn't create the booking. Please try again.")
      },
    })
  }

  if (done) {
    return (
      <DashboardPage maxWidth="narrow">
        <DashboardPanel>
          <div className="py-8 text-center">
            <CheckCircle2 className="mx-auto mb-3 size-9 text-emerald-600" />
            <h2 className="text-xl font-black tracking-tight text-[#101217]">Booking created</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm font-medium text-[#5f6268]">
              The appointment has been added to your schedule for{" "}
              <span className="font-bold text-[#101217]">{name || email}</span>.
            </p>
            <div className="mt-5 flex justify-center gap-2">
              <Link href="/dashboard/employee" className="inline-flex h-10 items-center bg-[#101217] px-4 text-sm font-bold text-white">
                Back to dashboard
              </Link>
              <button
                type="button"
                onClick={() => { setDone(false); setServiceId(""); setName(""); setEmail(""); setPhone(""); setLine1(""); setCity(""); setPostal(""); setNotes("") }}
                className="inline-flex h-10 items-center border border-black/15 bg-white px-4 text-sm font-bold text-[#101217]"
              >
                Book another
              </button>
            </div>
          </div>
        </DashboardPanel>
      </DashboardPage>
    )
  }

  return (
    <DashboardPage maxWidth="narrow">
      <DashboardHeader
        title="New booking"
        subtitle="Book a client in manually. This goes straight onto your schedule."
        actions={
          <Link href="/dashboard/employee" className="inline-flex h-10 items-center gap-1 border border-black/15 bg-white px-4 text-sm font-bold text-[#101217]">
            <ChevronLeft className="size-4" /> Back
          </Link>
        }
      />

      <DashboardPanel>
        <div className="grid gap-5">
          <div>
            <label className={labelClass}>Service</label>
            <select className={inputClass} value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
              <option value="">Select a service…</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.category_name ? `${s.category_name} · ` : ""}{s.name} ({s.duration_minutes} min)
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Client type</label>
              <select className={inputClass} value={clientType} onChange={(e) => setClientType(e.target.value)}>
                {CLIENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            {clientType === "group" ? (
              <div>
                <label className={labelClass}>Party size</label>
                <select className={inputClass} value={partySize} onChange={(e) => setPartySize(Number(e.target.value))}>
                  {[2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} people</option>)}
                </select>
              </div>
            ) : null}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Client name</label>
              <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="First name" />
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" inputMode="tel" />
            </div>
          </div>
          <div>
            <label className={labelClass}>Client email *</label>
            <input className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@email.com" type="email" />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Date</label>
              <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Time</label>
              <input type="time" className={inputClass} value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Service address</label>
            <input className={inputClass} value={line1} onChange={(e) => setLine1(e.target.value)} placeholder="Street address *" />
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            <input className={inputClass} value={city} onChange={(e) => setCity(e.target.value)} placeholder="City *" />
            <select className={inputClass} value={province} onChange={(e) => setProvince(e.target.value)}>
              {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <input className={inputClass} value={postal} onChange={(e) => setPostal(e.target.value)} placeholder="Postal code *" />
          </div>

          <div>
            <label className={labelClass}>Notes (optional)</label>
            <textarea className={`${inputClass} h-20 py-2`} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything the client mentioned" />
          </div>

          {error ? <p className="text-sm font-bold text-red-600">{error}</p> : null}

          <Button
            className="h-11 font-bold text-white"
            disabled={!canSubmit || createBooking.isPending}
            onClick={submit}
            style={{ background: "#c96c83", border: "none" }}
          >
            {createBooking.isPending ? "Creating…" : "Create booking"}
          </Button>
        </div>
      </DashboardPanel>
    </DashboardPage>
  )
}
