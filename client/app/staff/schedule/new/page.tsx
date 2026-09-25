"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Check, Plus } from "lucide-react"

import api from "@/lib/api"
import { useCreateStaffBooking, useEmployeeProfile, type StaffBookingInput } from "@/lib/hooks/use-employee"
import { useToast } from "@/lib/app-ui/app-ui-provider"
import { staffScreenClass, cardClass, inputClass, labelClass, mutedClass, staffTheme } from "../../staff-theme"

interface ApiService {
  id: number
  name: string
  duration_minutes: number
  price: string
  category_name: string | null
}

const PROVINCES = ["AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT"]
const CLIENT_TYPES = ["adult", "kids", "elderly", "group"]
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Staff-created booking - a purpose-built mobile form on the SAME
// useCreateStaffBooking hook the desktop uses. Books a client straight onto the
// tech's schedule. Every desktop field is here.
// useSearchParams needs a Suspense boundary or the static app export fails.
export default function StaffNewBookingScreen() {
  return (
    <Suspense>
      <StaffNewBooking />
    </Suspense>
  )
}

// ?date=YYYY-MM-DD&time=HH:MM pre-fill from the Schedule calendar.
function StaffNewBooking() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()
  const { data: services = [] } = useQuery<ApiService[]>({
    queryKey: ["public-services"],
    queryFn: () => api.get<ApiService[]>("/services").then((r) => r.data),
  })
  const { data: profile } = useEmployeeProfile()
  const createBooking = useCreateStaffBooking()

  const [serviceId, setServiceId] = useState("")
  const [addonIds, setAddonIds] = useState<number[]>([])
  const [clientType, setClientType] = useState("adult")
  const [partySize, setPartySize] = useState(2)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [date, setDate] = useState(searchParams.get("date") ?? "")
  const [time, setTime] = useState(searchParams.get("time") ?? "10:00")
  const [line1, setLine1] = useState("")
  const [city, setCity] = useState("")
  const [province, setProvince] = useState("ON")
  const [postal, setPostal] = useState("")
  const [notes, setNotes] = useState("")
  const [done, setDone] = useState(false)
  const today = todayInput()

  // Add-on candidates: the tech's OWN other services, matching the primary's
  // lashes/non-lashes bucket (a lash service only pairs with lashes; everything
  // else pairs among itself). The backend re-validates; this keeps the list sane.
  const primary = services.find((s) => String(s.id) === serviceId)
  const primaryIsLashes = isLashes(primary?.category_name)
  const addonOptions = useMemo(
    () =>
      (profile?.services ?? []).filter(
        (s) => String(s.id) !== serviceId && isLashes(s.category_name) === primaryIsLashes,
      ),
    [profile?.services, serviceId, primaryIsLashes],
  )
  const addonTotal = addonOptions
    .filter((s) => addonIds.includes(s.id))
    .reduce((sum, s) => sum + Number(s.price), 0)

  function toggleAddon(id: number) {
    setAddonIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))
  }

  function submit() {
    const problem = firstProblem()
    if (problem) {
      toast({ title: "Booking needs attention", description: problem, variant: "error" })
      return
    }

    const input: StaffBookingInput = {
      service_id: Number(serviceId),
      starts_at: `${date}T${time}:00`,
      customer: { email: email.trim(), first_name: name.trim() || undefined, phone: phone.trim() || undefined },
      client_type: clientType,
      party_size: clientType === "group" ? partySize : 1,
      address: { line1: line1.trim(), city: city.trim(), province, postal_code: postal.trim() },
      notes: notes.trim() || undefined,
    }
    const validAddonIds = addonOptions.filter((s) => addonIds.includes(s.id)).map((s) => s.id)
    if (validAddonIds.length) input.addon_service_ids = validAddonIds
    createBooking.mutate(input, {
      onSuccess: () => {
        setDone(true)
        toast({ title: "Booking created", variant: "success" })
      },
      onError: (e: unknown) => {
        const d = (e as { response?: { data?: { error?: string; errors?: string[] } } })?.response?.data
        toast({
          title: "Booking not created",
          description: d?.error ?? d?.errors?.join(", ") ?? "Please try again.",
          variant: "error",
        })
      },
    })
  }

  function firstProblem(): string | null {
    if (!serviceId) return "Select a service."
    if (!name.trim()) return "Client name is required."
    if (!email.trim()) return "Client email is required."
    if (!EMAIL_RE.test(email.trim())) return "Enter a valid email address."
    if (!date) return "Appointment date is required."
    if (!time) return "Appointment time is required."
    if (!line1.trim()) return "Street address is required."
    if (!city.trim()) return "City is required."
    if (!postal.trim()) return "Postal code is required."
    return null
  }

  if (done) {
    return (
      <div className={staffScreenClass}>
        <div className="flex min-h-[70dvh] flex-col items-center justify-center px-8 text-center">
          <span
            className="grid size-16 place-items-center rounded-full"
            style={{ background: `${staffTheme.live}22`, color: staffTheme.live }}
          >
            <Check className="size-8" aria-hidden />
          </span>
          <h1 className="mt-4 text-2xl font-black tracking-tight">Booking created</h1>
          <p className={`mt-2 text-sm ${mutedClass}`}>
            Added to your schedule for <span className="font-bold text-[#14100F]">{name || email}</span>.
          </p>
          <div className="mt-6 flex w-full max-w-xs flex-col gap-2">
            <button
              type="button"
              onClick={() => router.replace("/staff/schedule")}
              className="w-full rounded-xl bg-[#14100F] py-3.5 text-base font-bold text-white"
            >
              Back to schedule
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="w-full rounded-xl border border-black/10 bg-white py-3.5 text-base font-bold"
            >
              Book another
            </button>
          </div>
        </div>
      </div>
    )
  }

  function resetForm() {
    setDone(false)
    setServiceId("")
    setAddonIds([])
    setClientType("adult")
    setPartySize(2)
    setName("")
    setEmail("")
    setPhone("")
    setDate("")
    setTime("10:00")
    setLine1("")
    setCity("")
    setProvince("ON")
    setPostal("")
    setNotes("")
  }

  return (
    <div className={staffScreenClass}>
      <header className="flex items-center gap-3 px-4 pb-2 pt-[calc(1.25rem+env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Back"
          className="grid size-10 place-items-center rounded-full bg-white shadow-sm"
        >
          ‹
        </button>
        <div>
          <h1 className="text-2xl font-black tracking-tight leading-tight">New booking</h1>
          <p className={`text-sm ${mutedClass}`}>Book a client straight onto your schedule.</p>
        </div>
      </header>

      <div className={`${cardClass} mx-5 space-y-4 p-4`}>
        <div>
          <label className={labelClass}>Service</label>
          <select className={inputClass} value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
            <option value="">Select a service…</option>
            {services.map((s) => (
              <option key={s.id} value={String(s.id)}>
                {s.category_name ? `${s.category_name} · ` : ""}
                {s.name} ({s.duration_minutes} min)
              </option>
            ))}
          </select>
        </div>

        {/* Add-ons: extra services YOU also perform, done in the same visit. */}
        {serviceId && addonOptions.length > 0 && (
          <div>
            <div className="flex items-center justify-between">
              <label className={labelClass}>Add-ons</label>
              {addonTotal > 0 && (
                <span className="text-xs font-bold text-[#C96C83]">+${addonTotal.toFixed(2)}</span>
              )}
            </div>
            <p className={`mb-2 text-xs ${mutedClass}`}>Extra services you&apos;ll do in this visit.</p>
            <div className="space-y-1.5">
              {addonOptions.map((s) => {
                const on = addonIds.includes(s.id)
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleAddon(s.id)}
                    className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left ${
                      on ? "border-[#C96C83] bg-[#C96C83]/8" : "border-black/10 bg-white"
                    }`}
                  >
                    <span
                      className={`grid size-5 shrink-0 place-items-center rounded-md border ${
                        on ? "border-[#C96C83] bg-[#C96C83] text-white" : "border-black/20"
                      }`}
                    >
                      {on ? <Check className="size-3.5" aria-hidden /> : <Plus className="size-3.5 text-black/30" aria-hidden />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-[#14100F]">{s.name}</span>
                      <span className={`block text-xs ${mutedClass}`}>{s.duration_minutes} min</span>
                    </span>
                    <span className="shrink-0 text-sm font-bold text-[#14100F]">+${Number(s.price).toFixed(2)}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Client type</label>
            <select className={`${inputClass} capitalize`} value={clientType} onChange={(e) => setClientType(e.target.value)}>
              {CLIENT_TYPES.map((t) => (
                <option key={t} value={t} className="capitalize">
                  {t}
                </option>
              ))}
            </select>
          </div>
          {clientType === "group" && (
            <div>
              <label className={labelClass}>Party size</label>
              <select className={inputClass} value={String(partySize)} onChange={(e) => setPartySize(Number(e.target.value))}>
                {[2, 3, 4, 5].map((n) => (
                  <option key={n} value={String(n)}>
                    {n} people
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div>
          <label className={labelClass}>Client name</label>
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="First name" />
        </div>
        <div>
          <label className={labelClass}>Client email</label>
          <input className={inputClass} type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@email.com" />
        </div>
        <div>
          <label className={labelClass}>Phone (optional)</label>
          <input className={inputClass} type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Date</label>
            <input className={inputClass} type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Time</label>
            <input className={inputClass} type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>

        <div>
          <label className={labelClass}>Service address</label>
          <input className={inputClass} value={line1} onChange={(e) => setLine1(e.target.value)} placeholder="Street address" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <input className={`${inputClass} col-span-1`} value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
          <select className={inputClass} value={province} onChange={(e) => setProvince(e.target.value)}>
            {PROVINCES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <input className={inputClass} value={postal} onChange={(e) => setPostal(e.target.value)} placeholder="Postal" />
        </div>

        <div>
          <label className={labelClass}>Notes (optional)</label>
          <textarea className={`${inputClass} h-20`} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything the client mentioned" />
        </div>

        <button
          type="button"
          onClick={submit}
          disabled={createBooking.isPending}
          className="w-full rounded-xl bg-[#C96C83] py-3.5 text-base font-bold text-white disabled:opacity-50"
        >
          {createBooking.isPending ? "Creating…" : "Create booking"}
        </button>
      </div>
    </div>
  )
}

function todayInput() {
  const t = new Date()
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`
}

// Lashes is a siloed category (mirrors AddonBooker): it only combines with lashes.
function isLashes(categoryName: string | null | undefined) {
  return (categoryName ?? "").toLowerCase() === "lashes"
}
