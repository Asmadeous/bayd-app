"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useMutation, useQuery } from "@tanstack/react-query"
import { CalendarDays, Check, CheckCircle2, ChevronLeft, Clock, MapPin, Phone, Send, Sparkles, User } from "lucide-react"

import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import api from "@/lib/api"
import { useCoverage } from "@/lib/hooks/use-coverage"
import { siteConfig } from "@/lib/site"

// Same company number as the footer; used for the out-of-area call / WhatsApp options.
const WHATSAPP_HREF = `https://wa.me/${siteConfig.phoneHref.replace(/\D/g, "")}?text=${encodeURIComponent(
  "Hi Beauty @ Your Door, I'd like to book a service — can you check if my area is covered?",
)}`

type ClientType = "adult" | "kids" | "elderly" | "group"

const CLIENT_TYPES: { key: ClientType; label: string; hint: string }[] = [
  { key: "adult", label: "Adult", hint: "" },
  { key: "kids", label: "Kids", hint: "up to 13" },
  { key: "elderly", label: "Elderly", hint: "" },
  { key: "group", label: "Group", hint: "up to 5" },
]

const PROVINCES = ["AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT"]
const TODAY = new Date().toISOString().split("T")[0]
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/
// Canadian postal code (space optional). Same rule the backend enforces.
const CA_POSTAL = /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z] ?\d[ABCEGHJ-NPRSTV-Z]\d$/i

interface Provider { id: number; name: string | null; title: string | null; photo_url: string | null }
interface ApiService {
  id: number
  name: string
  description: string | null
  duration_minutes: number
  price: string
  image_url: string | null
  category_name: string | null
  kids_only: boolean
  requires_consultation: boolean
  prices?: Partial<Record<ClientType, string>>
  providers?: Provider[]
}
interface GeoResult { allowed: boolean; country: string | null }
interface BookingRequestResponse {
  booking_request: { id: number; status: string }
  booking?: { id: number }
  payment?: { mode: string; url?: string; error?: string }
  code?: string
  error?: string
}

const GROUP_MAX = 5

const field =
  "h-11 w-full border border-black/15 bg-white px-3 text-sm font-semibold text-[#101217] outline-none transition-colors placeholder:text-[#8a8d93] focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20"
const lbl = "mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-[#6b6f76]"
const card = "border border-black/10 bg-white p-5 sm:p-6"

const STEPS = ["Service", "Date", "Staff", "Details", "Payment"] as const

export default function PublicBookPage() {
  const geo = useQuery<GeoResult>({
    queryKey: ["geo"],
    queryFn: () => api.get<GeoResult>("/geo").then((r) => r.data),
    retry: false,
    staleTime: 30 * 60 * 1000,
  })
  const { data: services = [] } = useQuery<ApiService[]>({
    queryKey: ["public-services"],
    queryFn: () => api.get<ApiService[]>("/services").then((r) => r.data),
  })

  const [step, setStep] = useState(0)
  const [clientType, setClientType] = useState<ClientType>("adult")
  const [partySize, setPartySize] = useState(2)
  const [categoryFilter, setCategoryFilter] = useState<string>("all") // "all" | category_name
  const [serviceId, setServiceId] = useState("")
  const [staff, setStaff] = useState<string>("any") // "any" | providerId
  const [date, setDate] = useState("")
  const [time, setTime] = useState("10:00")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [line1, setLine1] = useState("")
  const [unit, setUnit] = useState("")
  const [city, setCity] = useState("")
  const [province, setProvince] = useState("ON")
  const [postal, setPostal] = useState("")
  const [isApartment, setIsApartment] = useState(false)
  const [buzzCode, setBuzzCode] = useState("")
  const [notes, setNotes] = useState("")
  const [tip, setTip] = useState("") // optional gratuity in dollars
  const [giftCard, setGiftCard] = useState("")
  const [bookedMsg, setBookedMsg] = useState("")
  const [view, setView] = useState<"form" | "booked" | "consultation">("form")
  const [error, setError] = useState<string | null>(null)
  const [addressError, setAddressError] = useState<string | null>(null)
  const [verifyingAddress, setVerifyingAddress] = useState(false)

  // Kids see only kids services; everyone else sees the regular menu.
  const menu = useMemo(
    () => services.filter((s) => (clientType === "kids" ? s.kids_only : !s.kids_only)),
    [services, clientType],
  )
  // Distinct categories present in the current menu, for the filter chips.
  const categories = useMemo(() => {
    const seen: string[] = []
    for (const s of menu) {
      const key = s.category_name ?? "Other"
      if (!seen.includes(key)) seen.push(key)
    }
    return seen
  }, [menu])
  // Group the menu by category, honouring the active category filter.
  const grouped = useMemo(() => {
    const map = new Map<string, ApiService[]>()
    for (const s of menu) {
      const key = s.category_name ?? "Other"
      if (categoryFilter !== "all" && key !== categoryFilter) continue
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(s)
    }
    return map
  }, [menu, categoryFilter])

  const selected = services.find((s) => String(s.id) === serviceId)
  const providers = selected?.providers ?? []
  const perPerson = (s: ApiService) => Number(s.prices?.[clientType] ?? s.price)
  // Group total = per-person price × number of people.
  const totalFor = (s: ApiService) => (clientType === "group" ? perPerson(s) * partySize : perPerson(s))
  const price = selected ? totalFor(selected) : null
  const staffLabel =
    staff === "any" ? "Any available" : providers.find((p) => String(p.id) === staff)?.name ?? "Technician"
  // Client-side estimate only (backend is authoritative: 25% / $50 min defaults).
  const depositEstimate = Math.min(Math.max((price ?? 0) * 0.25, 50), price ?? 0)

  const coverage = useCoverage(postal)
  const notServiced = coverage.data ? !coverage.data.covered : false

  const createBooking = useMutation({
    mutationFn: (pay: { timing: "pay_upfront" | "pay_after"; groupCharge?: "deposit" | "full" }) =>
      api
        .post<BookingRequestResponse>("/booking_requests", {
          customer: { first_name: name.trim() || undefined, email: email.trim(), phone: phone.trim() },
          address: {
            line1: line1.trim(),
            line2: unit.trim() || undefined,
            city: city.trim(),
            province,
            postal_code: postal.trim(),
            is_apartment: isApartment,
            buzz_code: isApartment ? buzzCode.trim() || undefined : undefined,
          },
          booking_request: {
            service_id: Number(serviceId),
            kind: "scheduled",
            client_type: clientType,
            party_size: clientType === "group" ? partySize : 1,
            requested_employee_id: staff !== "any" ? Number(staff) : undefined,
            requested_start: `${date}T${time}:00`,
            payment_timing: pay.timing,
            group_charge: pay.groupCharge,
            tip: tip ? Number(tip) : undefined,
            gift_card_code: giftCard.trim() || undefined,
            notes: notes.trim() || undefined,
          },
        })
        .then((r) => r.data),
  })

  const requestCallback = useMutation({
    mutationFn: () =>
      api.post("/callback_requests", {
        callback_request: {
          service_id: serviceId ? Number(serviceId) : undefined,
          postal_code: postal.trim(),
          contact_name: name.trim() || undefined,
          contact_phone: phone.trim() || undefined,
          notes: notes.trim() || undefined,
        },
      }),
    onSuccess: () => setView("consultation"),
  })

  function chooseService(id: number) {
    setServiceId(String(id))
    const provs = services.find((s) => s.id === id)?.providers ?? []
    setStaff(provs.length === 1 ? String(provs[0].id) : "any") // auto-pick when only one tech
    setStep(1)
  }

  const isTimeValid = TIME_PATTERN.test(time)
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const postalFormatOk = CA_POSTAL.test(postal.trim())
  const stepValid = [
    !!serviceId, // Service
    !!date && isTimeValid, // Date & time
    !!staff, // Staff (auto or picked; "any" is valid)
    // Details: email + all address fields + a Canadian postal format. The
    // realness/Canada check runs against the backend when they tap Continue.
    emailValid && !!line1.trim() && !!city.trim() && postalFormatOk,
    true, // Payment (pay-after is always valid)
  ]

  // Verify the typed address is a real Canadian one (Google geocode via our
  // backend) before advancing off the Details step. Blocks on failure.
  async function verifyAddressThenAdvance() {
    setAddressError(null)
    if (!postalFormatOk) {
      setAddressError("Enter a valid Canadian postal code (e.g. M5J 2X5).")
      return
    }
    setVerifyingAddress(true)
    try {
      const { data } = await api.post<{ valid: boolean; in_canada: boolean; postal_format_ok: boolean; error?: string }>(
        "/geo/verify_address",
        { line1: line1.trim(), city: city.trim(), province, postal_code: postal.trim() },
      )
      if (data.valid) {
        setStep((s) => s + 1)
      } else if (!data.postal_format_ok) {
        setAddressError("Enter a valid Canadian postal code (e.g. M5J 2X5).")
      } else if (!data.in_canada) {
        setAddressError("We couldn't find that address in Canada. Check the street, city, and postal code.")
      } else {
        setAddressError("Please double-check your address details.")
      }
    } catch {
      setAddressError("Couldn't verify your address just now. Please try again.")
    } finally {
      setVerifyingAddress(false)
    }
  }

  // intent: "proceed" (bypass, pay after) | "pay_now" | "deposit" | "full"
  async function submit(intent: "proceed" | "pay_now" | "deposit" | "full") {
    setError(null)
    if (notServiced) {
      requestCallback.mutate()
      return
    }
    const pay: { timing: "pay_upfront" | "pay_after"; groupCharge?: "deposit" | "full" } =
      intent === "proceed"
        ? { timing: "pay_after" }
        : intent === "pay_now"
          ? { timing: "pay_upfront" }
          : { timing: "pay_after", groupCharge: intent } // group deposit/full
    try {
      const data = await createBooking.mutateAsync(pay)
      // Pay-now / group deposit-or-full with a balance → Square hosted checkout.
      if (data.payment?.mode === "link" && data.payment.url) {
        window.location.href = data.payment.url
        return
      }
      if (data.booking) {
        const mode = data.payment?.mode
        setBookedMsg(
          mode === "charged"
            ? "Payment received — your appointment is confirmed. Thank you!"
            : mode === "gift_card_paid"
              ? "Your gift card covered it — your appointment is confirmed!"
              : "Your appointment is confirmed! Payment is collected after your service.",
        )
        setView("booked")
      } else {
        setError("We couldn't confirm that technician for your time. Try another slot or technician.")
      }
    } catch (err: unknown) {
      const res = (err as { response?: { status?: number; data?: BookingRequestResponse } })?.response
      if (res?.status === 403 && res.data?.error === "outside_country") {
        geo.refetch()
        return
      }
      if (res?.data?.code === "no_coverage") {
        requestCallback.mutate()
        return
      }
      setError(res?.data?.error ?? "Something went wrong. Please try again.")
    }
  }

  // ── Non-Canada block ────────────────────────────────────────────────────────
  if (geo.data && !geo.data.allowed) {
    return (
      <Shell>
        <div className={cn(card, "text-center")}>
          <MapPin className="mx-auto mb-3 size-8 text-[#c96c83]" />
          <h1 className="text-xl font-black tracking-tight">We serve Canada only</h1>
          <p className="mx-auto mt-2 max-w-md text-sm font-medium text-[#5f6268]">
            Beauty @ Your Door is a mobile service across the Greater Toronto Area. We can only accept
            booking requests from within Canada.
          </p>
        </div>
      </Shell>
    )
  }

  if (view === "booked") {
    return (
      <Shell>
        <div className={cn(card, "text-center")}>
          <CheckCircle2 className="mx-auto mb-3 size-9 text-emerald-600" />
          <h1 className="text-xl font-black tracking-tight">You&apos;re booked!</h1>
          <p className="mx-auto mt-2 max-w-md text-sm font-medium text-[#5f6268]">
            {bookedMsg || "Your appointment is confirmed."} We&apos;ll reach you at{" "}
            <span className="font-bold text-[#101217]">{email}</span>.
          </p>
          <Link href="/" className="mt-5 inline-block bg-[#101217] px-5 py-2.5 text-sm font-bold text-white">
            Back to home
          </Link>
        </div>
      </Shell>
    )
  }

  if (view === "consultation") {
    return (
      <Shell>
        <div className={cn(card, "text-center")}>
          <Phone className="mx-auto mb-3 size-9 text-[#c96c83]" />
          <h1 className="text-xl font-black tracking-tight">We&apos;ll call you</h1>
          <p className="mx-auto mt-2 max-w-md text-sm font-medium text-[#5f6268]">
            Your area is just outside our usual coverage, but our team will call to see if a technician can
            reach you and arrange a consultation. A minimum <span className="font-bold text-[#101217]">$50 travel
            fee</span> applies to out-of-area visits, confirmed with you on the call. Prefer to reach us now?
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <a
              href={`tel:${siteConfig.phoneHref}`}
              className="inline-flex h-10 items-center gap-1.5 px-4 text-sm font-bold text-white"
              style={{ background: "#c96c83" }}
            >
              <Phone className="size-4" /> Call {siteConfig.phone}
            </a>
            <a
              href={WHATSAPP_HREF}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center gap-1.5 px-4 text-sm font-bold text-white"
              style={{ background: "#25D366" }}
            >
              <Send className="size-4" /> WhatsApp
            </a>
          </div>
          <Link href="/" className="mt-5 inline-block bg-[#101217] px-5 py-2.5 text-sm font-bold text-white">
            Back to home
          </Link>
        </div>
      </Shell>
    )
  }

  return (
    <>
      <SiteHeader />
      <Shell>
        <div className="mb-5">
          <span className="inline-flex items-center gap-1.5 bg-[#c96c83]/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#c96c83]">
            <Sparkles className="size-3.5" /> Book a service
          </span>
          <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">Beauty, at your door</h1>
          <p className="mt-1 text-sm font-medium text-[#5f6268]">
            No account needed — just your email. You can book without paying now and settle up after your service.
          </p>
        </div>

      {/* Stepper */}
      <div className="mb-6 flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex flex-1 items-center gap-2">
            <div
              className={cn(
                "grid size-7 shrink-0 place-items-center border text-xs font-black",
                i < step
                  ? "border-[#c96c83] bg-[#c96c83] text-white"
                  : i === step
                    ? "border-[#c96c83] bg-white text-[#c96c83]"
                    : "border-black/15 bg-white text-[#a7abb2]",
              )}
            >
              {i < step ? <Check className="size-3.5" /> : i + 1}
            </div>
            <span className={cn("hidden text-xs font-bold sm:block", i === step ? "text-[#101217]" : "text-[#a7abb2]")}>
              {label}
            </span>
            {i < STEPS.length - 1 ? <div className="h-px flex-1 bg-black/10" /> : null}
          </div>
        ))}
      </div>

      {/* Step 1 — Service (with age selector) */}
      {step === 0 ? (
        <div className={card}>
          <label className={lbl}>Who is it for?</label>
          <div className="mb-5 flex flex-wrap gap-2">
            {CLIENT_TYPES.map((ct) => (
              <button
                key={ct.key}
                type="button"
                onClick={() => {
                  setClientType(ct.key)
                  setServiceId("") // service list changes with audience
                  setCategoryFilter("all") // reset the category filter for the new menu
                }}
                className={cn(
                  "border px-3 py-2 text-sm font-bold transition-colors",
                  clientType === ct.key
                    ? "border-[#c96c83] bg-[#c96c83]/10 text-[#c96c83]"
                    : "border-black/15 bg-white text-[#5f6268] hover:border-black/30",
                )}
              >
                {ct.label}
                {ct.hint ? <span className="ml-1 text-[11px] font-medium opacity-70">({ct.hint})</span> : null}
              </button>
            ))}
          </div>

          {clientType === "group" ? (
            <div className="mb-5">
              <label className={lbl}>Number of people</label>
              <select className={field} value={partySize} onChange={(e) => setPartySize(Number(e.target.value))}>
                {Array.from({ length: GROUP_MAX - 1 }, (_, i) => i + 2).map((n) => (
                  <option key={n} value={n}>{n} people</option>
                ))}
              </select>
              <p className="mt-1.5 text-xs font-medium text-[#8a8d93]">
                Group price = per-person price × people. Groups require a deposit to confirm — the greater of 25%
                or a <span className="font-bold text-[#101217]">$50 minimum</span> — paid now.
              </p>
            </div>
          ) : null}

          <label className={lbl}>Choose a service</label>
          {/* Category selector chips — filter the menu by Nails / Lashes / etc. */}
          {categories.length > 1 ? (
            <div className="mb-4 flex flex-wrap gap-2">
              <CategoryChip
                label="All"
                active={categoryFilter === "all"}
                onClick={() => setCategoryFilter("all")}
              />
              {categories.map((cat) => (
                <CategoryChip
                  key={cat}
                  label={cat}
                  active={categoryFilter === cat}
                  onClick={() => setCategoryFilter(cat)}
                />
              ))}
            </div>
          ) : null}

          <div className="grid max-h-[30rem] gap-4 overflow-y-auto pr-1">
            {Array.from(grouped.entries()).map(([category, list]) => {
              return (
                <div key={category}>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#a7abb2]">{category}</p>
                  <div className="grid gap-2">
                    {list.map((s) => {
                      const p = totalFor(s)
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => chooseService(s.id)}
                          className="flex items-start gap-3 border border-black/15 bg-white p-3 text-left transition-colors hover:border-[#c96c83]"
                        >
                          {/* Thumbnail — real photo (all services have one); neutral fill if missing. */}
                          {s.image_url ? (
                            <span className="size-16 shrink-0 overflow-hidden rounded-lg bg-[#f0ece4]">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={s.image_url} alt={s.name} className="size-full object-cover" />
                            </span>
                          ) : (
                            <span className="size-16 shrink-0 rounded-lg bg-[#f0ece4]" />
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-bold text-[#101217]">{s.name}</span>
                            {s.description ? (
                              <span className="mt-0.5 line-clamp-2 block text-xs leading-snug text-[#5f6268]">{s.description}</span>
                            ) : null}
                            <span className="mt-0.5 block text-xs font-medium text-[#8a8d93]">{s.duration_minutes} min</span>
                          </span>
                          <span className="shrink-0 self-center text-sm font-black text-[#c96c83]">
                            {s.requires_consultation ? "Quote" : `$${p.toFixed(2)}`}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
            {menu.length === 0 ? <p className="text-sm font-medium text-[#8a8d93]">No services available.</p> : null}
          </div>
        </div>
      ) : null}

      {/* Step 2 — Date & time */}
      {step === 1 ? (
        <div className={card}>
          {selected ? (
            <p className="mb-4 text-sm font-semibold text-[#101217]">
              {selected.name} · <span className="text-[#c96c83]">{price != null ? `$${price.toFixed(2)}` : "Quote"}</span>
            </p>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={lbl}><CalendarDays className="mr-1 inline size-3.5" /> Date</label>
              <input type="date" min={TODAY} className={field} value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <label className={lbl}><Clock className="mr-1 inline size-3.5" /> Time</label>
              <input type="time" className={field} value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>
          <p className="mt-3 text-xs font-medium text-[#8a8d93]">Hours: Mon–Sat, 9:00 AM – 7:30 PM (Eastern).</p>
        </div>
      ) : null}

      {/* Step 3 — Staff */}
      {step === 2 ? (
        <div className={card}>
          <label className={lbl}>Choose your technician</label>
          {selected ? (
            <p className="mb-4 text-sm font-semibold text-[#101217]">
              {selected.name} · <span className="text-[#c96c83]">{price != null ? `$${price.toFixed(2)}` : "Quote"}</span>
            </p>
          ) : null}
          <div className="grid gap-2">
            {providers.length > 1 ? (
              <StaffOption label="Any available" hint="We'll match the best-fit technician" active={staff === "any"} onClick={() => setStaff("any")} />
            ) : null}
            {providers.map((p) => (
              <StaffOption
                key={p.id}
                label={p.name ?? "Technician"}
                hint={p.title ?? undefined}
                photo={p.photo_url ?? undefined}
                active={staff === String(p.id)}
                onClick={() => setStaff(String(p.id))}
              />
            ))}
            {providers.length === 0 ? (
              <p className="text-sm font-medium text-[#8a8d93]">A technician will be matched automatically.</p>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Step 4 — Details */}
      {step === 3 ? (
        <div className={card}>
          <label className={lbl}><User className="mr-1 inline size-3.5" /> Your details</label>
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <input className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="First name" />
              <input className={field} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" inputMode="tel" />
            </div>
            <input className={field} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email *" type="email" />

            <label className={cn(lbl, "mt-1")}><MapPin className="mr-1 inline size-3.5" /> Service address</label>
            <input className={field} value={line1} onChange={(e) => setLine1(e.target.value)} placeholder="Street address *" />
            <div className="grid gap-4 sm:grid-cols-3">
              <input className={field} value={city} onChange={(e) => setCity(e.target.value)} placeholder="City *" />
              <select className={field} value={province} onChange={(e) => setProvince(e.target.value)}>
                {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <input
                className={cn(field, postal.trim() && !postalFormatOk ? "border-red-400 focus:border-red-500 focus:ring-red-500/20" : "")}
                value={postal}
                onChange={(e) => { setPostal(e.target.value); setAddressError(null) }}
                placeholder="Postal code *"
                autoCapitalize="characters"
              />
            </div>
            {postal.trim() && !postalFormatOk ? (
              <p className="-mt-2 text-xs font-semibold text-red-600">Enter a valid Canadian postal code (e.g. M5J 2X5).</p>
            ) : null}
            <label className="flex items-center gap-2 text-sm font-semibold text-[#101217]">
              <input type="checkbox" checked={isApartment} onChange={(e) => setIsApartment(e.target.checked)} className="size-4 accent-[#c96c83]" />
              This is an apartment / condo
            </label>
            {isApartment ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <input className={field} value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Unit / suite number" />
                <input className={field} value={buzzCode} onChange={(e) => setBuzzCode(e.target.value)} placeholder="Buzz code (to reach you)" />
              </div>
            ) : null}
            <textarea className={cn(field, "h-20 py-2")} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes for your technician (optional)" />
          </div>

          {postal.trim().length >= 3 && coverage.data ? (
            notServiced ? (
              <div className="mt-4 border border-amber-300 bg-amber-50 p-4">
                <p className="text-sm font-bold text-amber-900">Just outside our usual area</p>
                <p className="mt-1 text-sm font-medium text-amber-800">
                  Submit below and our team will call to see if a technician can reach you. Visits outside our
                  service area carry a minimum <span className="font-bold">$50 travel fee</span>, confirmed with you
                  on the call.
                </p>
              </div>
            ) : (
              <p className="mt-3 text-sm font-semibold text-emerald-700">✓ We serve your area.</p>
            )
          ) : null}

          {addressError ? (
            <div className="mt-4 border border-red-300 bg-red-50 p-3">
              <p className="text-sm font-bold text-red-700">{addressError}</p>
            </div>
          ) : null}

          {error ? <p className="mt-3 text-sm font-bold text-red-600">{error}</p> : null}
        </div>
      ) : null}

      {/* Step 5 — Payment */}
      {step === 4 ? (
        <div className={card}>
          {/* Summary */}
          <div className="mb-5 border-b border-black/10 pb-4">
            <p className="text-sm font-bold text-[#101217]">{selected?.name}</p>
            <p className="text-xs font-medium text-[#8a8d93]">
              {staffLabel} · {date} at {time}
              {clientType === "group" ? ` · ${partySize} people` : ""}
            </p>
            <p className="mt-2 text-lg font-black text-[#101217]">
              {price != null ? `$${price.toFixed(2)}` : "Quote"}
              <span className="ml-1 text-xs font-medium text-[#8a8d93]">total</span>
            </p>
            {clientType === "group" ? (
              <p className="mt-1 text-sm font-semibold text-[#c96c83]">
                Pay a deposit (${depositEstimate.toFixed(2)}) or the full ${(price ?? 0).toFixed(2)} to confirm.
              </p>
            ) : null}
          </div>

          <label className={lbl}>Add a tip (optional)</label>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {[0, 15, 18, 20].map((pct) => {
              const amt = pct === 0 ? 0 : Math.round((price ?? 0) * pct) / 100
              const active = pct === 0 ? !tip : tip === amt.toFixed(2)
              return (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setTip(pct === 0 ? "" : amt.toFixed(2))}
                  className={cn(
                    "border px-3 py-2 text-sm font-bold transition-colors",
                    active ? "border-[#c96c83] bg-[#c96c83]/10 text-[#c96c83]" : "border-black/15 bg-white text-[#5f6268] hover:border-black/30",
                  )}
                >
                  {pct === 0 ? "No tip" : `${pct}%`}
                </button>
              )
            })}
            <div className="flex items-center gap-1">
              <span className="text-sm font-bold text-[#8a8d93]">$</span>
              <input className={cn(field, "w-24")} value={tip} onChange={(e) => setTip(e.target.value)} placeholder="custom" inputMode="decimal" />
            </div>
          </div>

          <label className={lbl}>Gift card (optional)</label>
          <input className={field} value={giftCard} onChange={(e) => setGiftCard(e.target.value)} placeholder="Gift card code" />
          <p className="mt-1.5 text-xs font-medium text-[#8a8d93]">Applied first; any remaining balance is collected at checkout.</p>

          {tip && Number(tip) > 0 ? (
            <p className="mt-3 text-sm font-semibold text-[#101217]">
              Total with tip: <span className="text-[#c96c83]">${((price ?? 0) + (Number(tip) || 0)).toFixed(2)}</span>
            </p>
          ) : null}

          {/* Book-without-paying explainer (regular bookings only; groups must deposit). */}
          {clientType !== "group" ? (
            <div className="mt-5 border border-[#c96c83]/30 bg-[#c96c83]/5 p-4">
              <p className="text-sm font-bold text-[#101217]">Prefer to pay later? You don&apos;t have to pay now.</p>
              <p className="mt-1 text-sm font-medium text-[#5f6268]">
                Tap <span className="font-bold text-[#101217]">&ldquo;Proceed to booking&rdquo;</span> to confirm with
                just your email — no card required. Your technician arrives, and you settle up after the service
                (card, or your card on file). We send your confirmation to{" "}
                <span className="font-bold text-[#101217]">{email || "your email"}</span>.
              </p>
              <p className="mt-2 text-xs font-medium text-[#8a8d93]">
                Or tap &ldquo;Pay now&rdquo; to pay securely online in advance — your choice.
              </p>
            </div>
          ) : null}

          {error ? <p className="mt-3 text-sm font-bold text-red-600">{error}</p> : null}
        </div>
      ) : null}

      {/* Nav */}
      <div className="mt-5 flex items-center gap-3">
        {step > 0 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="inline-flex h-12 items-center gap-1 border border-black/15 bg-white px-4 text-sm font-bold text-[#101217]"
          >
            <ChevronLeft className="size-4" /> Back
          </button>
        ) : null}
        {step === 3 && notServiced ? (
          // Out of area — offer a consultation call instead of proceeding to payment.
          <button
            type="button"
            disabled={!stepValid[step] || requestCallback.isPending}
            onClick={() => requestCallback.mutate()}
            className="h-12 flex-1 bg-[#101217] text-sm font-bold uppercase tracking-wide text-white disabled:opacity-40"
          >
            {requestCallback.isPending ? "Submitting…" : "Request a consultation call"}
          </button>
        ) : step < STEPS.length - 1 ? (
          <button
            type="button"
            disabled={!stepValid[step] || (step === 3 && verifyingAddress)}
            onClick={() => (step === 3 ? verifyAddressThenAdvance() : setStep((s) => s + 1))}
            className="h-12 flex-1 bg-[#101217] text-sm font-bold uppercase tracking-wide text-white disabled:opacity-40"
          >
            {step === 3 && verifyingAddress ? "Verifying address…" : "Continue"}
          </button>
        ) : clientType === "group" ? (
          // Group: mandatory payment — deposit or full, both go to checkout.
          <div className="flex flex-1 flex-col gap-2 sm:flex-row">
            <button
              type="button"
              disabled={createBooking.isPending}
              onClick={() => submit("deposit")}
              className="h-12 flex-1 border border-[#101217] bg-white text-sm font-bold uppercase tracking-wide text-[#101217] disabled:opacity-40"
            >
              {createBooking.isPending ? "…" : `Pay deposit $${depositEstimate.toFixed(2)}`}
            </button>
            <button
              type="button"
              disabled={createBooking.isPending}
              onClick={() => submit("full")}
              className="h-12 flex-1 bg-[#101217] text-sm font-bold uppercase tracking-wide text-white disabled:opacity-40"
            >
              {createBooking.isPending ? "…" : `Pay full $${(price ?? 0).toFixed(2)}`}
            </button>
          </div>
        ) : (
          // Regular: pay now (→ checkout) or proceed without paying (pay after).
          <div className="flex flex-1 flex-col gap-2 sm:flex-row">
            <button
              type="button"
              disabled={createBooking.isPending}
              onClick={() => submit("proceed")}
              className="h-12 flex-1 border border-[#101217] bg-white text-sm font-bold uppercase tracking-wide text-[#101217] disabled:opacity-40"
            >
              {createBooking.isPending ? "…" : "Proceed to booking"}
            </button>
            <button
              type="button"
              disabled={createBooking.isPending}
              onClick={() => submit("pay_now")}
              className="h-12 flex-1 bg-[#101217] text-sm font-bold uppercase tracking-wide text-white disabled:opacity-40"
            >
              {createBooking.isPending ? "…" : "Pay now"}
            </button>
          </div>
        )}
      </div>

        <p className="mt-4 text-center text-xs font-medium text-[#8a8d93]">
          Already have an account? <Link href="/signin" className="font-bold text-[#c96c83]">Sign in</Link>
        </p>
      </Shell>
      <SiteFooter />
    </>
  )
}

function CategoryChip({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center border px-3 py-1.5 text-xs font-bold transition-colors",
        active
          ? "border-[#c96c83] bg-[#c96c83] text-white"
          : "border-black/15 bg-white text-[#5f6268] hover:border-[#c96c83]",
      )}
    >
      {label}
    </button>
  )
}

function StaffOption({
  label, hint, photo, active, onClick,
}: { label: string; hint?: string; photo?: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 border px-4 py-3 text-left transition-colors",
        active ? "border-[#c96c83] bg-[#c96c83]/10" : "border-black/15 bg-white hover:border-black/30",
      )}
    >
      <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-[#f0ece4] text-[#c96c83]">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt={label} className="size-full object-cover" />
        ) : (
          <User className="size-5" />
        )}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-bold text-[#101217]">{label}</span>
        {hint ? <span className="block truncate text-xs font-medium text-[#8a8d93]">{hint}</span> : null}
      </span>
      {active ? <Check className="ml-auto size-4 text-[#c96c83]" /> : null}
    </button>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f4f1eb] text-[#101217]">
      <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-14">{children}</div>
    </main>
  )
}

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ")
}
