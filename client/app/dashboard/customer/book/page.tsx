"use client"

import { Suspense, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useMutation, useQuery } from "@tanstack/react-query"
import { CalendarDays, CheckCircle2, ChevronDown, Clock, MapPin, Sparkles, X } from "lucide-react"

import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { PwaInstallCard } from "@/components/pwa-install-card"
import { Button } from "@/components/ui/button"
import api from "@/lib/api"
import { useCoverage } from "@/lib/hooks/use-coverage"
import { useAuthStore } from "@/lib/stores/auth-store"

/* ─── API shapes ─── */
type ClientType = "adult" | "kids" | "elderly" | "group"

const CLIENT_TYPES: { key: ClientType; label: string; hint: string }[] = [
  { key: "adult", label: "Adult", hint: "" },
  { key: "kids", label: "Kids", hint: "" },
  { key: "elderly", label: "Elderly", hint: "" },
  { key: "group", label: "Group", hint: "5 people" },
]

interface ApiService {
  id: number
  name: string
  description: string | null
  duration_minutes: number
  price: string
  category_name: string | null
  prices: Record<ClientType, string>
  group_size: number
}

interface ApiAddress {
  id: number
  label: string | null
  line1: string
  line2: string | null
  city: string
  province: string
  postal_code: string | null
}

interface BookingRequestResponse {
  booking_request: { id: number; status: string }
  booking?: { id: number }
  payment?: { mode: string; url?: string; error?: string }
  error?: string
}

/* ─── Helpers ─── */
const COMPANY_PHONE = process.env.NEXT_PUBLIC_COMPANY_PHONE ?? ""

const TIME_SLOTS = Array.from({ length: 21 }, (_, i) => {
  const totalMins = 9 * 60 + i * 30
  const h = Math.floor(totalMins / 60)
  const m = totalMins % 60
  const label = `${h % 12 === 0 ? 12 : h % 12}:${m === 0 ? "00" : m} ${h < 12 ? "AM" : "PM"}`
  const value = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
  return { label, value }
})

const TODAY = new Date().toISOString().split("T")[0]

const PROVINCES = [
  "AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT",
]

type AddressMode = "saved" | "new"

const BLANK_ADDRESS = { label: "", line1: "", line2: "", city: "", province: "ON", postal_code: "" }

/* Subscription frequency presets (unit + count sent to the API) */
const FREQUENCIES = [
  { key: "none", label: "One-time", unit: null, count: 0 },
  { key: "daily", label: "Daily", unit: "day", count: 1 },
  { key: "weekly", label: "Weekly", unit: "week", count: 1 },
  { key: "biweekly", label: "Every 2 weeks", unit: "week", count: 2 },
  { key: "monthly", label: "Monthly", unit: "month", count: 1 },
  { key: "quarterly", label: "Every 3 months", unit: "month", count: 3 },
  { key: "semiannual", label: "Every 6 months", unit: "month", count: 6 },
  { key: "yearly", label: "Yearly", unit: "year", count: 1 },
] as const

/* ─── Component ─── */
function CustomerBookPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedService = searchParams.get("service")

  const [serviceIdOverride, setServiceId] = useState<string | null>(null)
  const [date, setDate] = useState("")
  const [time, setTime] = useState("10:00")
  // Address mode + saved selection are derived from the loaded addresses, with
  // a user override — so we never sync async data into state via an effect.
  const [addressModeOverride, setAddressMode] = useState<AddressMode | null>(null)
  const [savedAddressOverride, setSavedAddressId] = useState("")
  // Seed the new-address form from the signed-in user's profile address (drawn
  // from the store synchronously so it's there on first render, still editable).
  const [newAddress, setNewAddress] = useState(() => {
    const u = useAuthStore.getState().user
    return {
      ...BLANK_ADDRESS,
      line1: u?.street_address ?? "",
      city: u?.city ?? "",
      postal_code: u?.postal_code ?? "",
    }
  })
  const [clientType, setClientType] = useState<ClientType>("adult")
  const [recurrence, setRecurrence] = useState<string>("none")
  const [autoCharge, setAutoCharge] = useState(false)
  const [payUpfront, setPayUpfront] = useState(false)
  const [tip, setTip] = useState<string>("")
  const [giftCardCode, setGiftCardCode] = useState("")
  const [bookedForName, setBookedForName] = useState("")
  const [bookedForPhone, setBookedForPhone] = useState("")
  const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null)

  /* ─── Card on file (enables auto-charge for recurring bookings) ─── */
  const { data: me } = useQuery<{ has_card_on_file: boolean }>({
    queryKey: ["auth-me-card"],
    queryFn: () => api.get<{ has_card_on_file: boolean }>("/auth/me").then((r) => r.data),
  })
  const hasCard = me?.has_card_on_file ?? false

  /* ─── Fetch services ─── */
  const { data: services = [] } = useQuery<ApiService[]>({
    queryKey: ["booking-services"],
    queryFn: () => api.get<ApiService[]>("/services").then((r) => r.data),
  })

  /* ─── Fetch addresses ─── */
  const { data: addresses = [] } = useQuery<ApiAddress[]>({
    queryKey: ["user-addresses"],
    queryFn: () => api.get<ApiAddress[]>("/addresses").then((r) => r.data),
  })

  /* ─── Derived address selection (no effect syncing async → state) ─── */
  const defaultAddressId = useMemo(() => {
    const def = addresses.find((a) => (a as unknown as { default: boolean }).default)
    return String(def?.id ?? addresses[0]?.id ?? "")
  }, [addresses])
  const addressMode: AddressMode = addressModeOverride ?? (addresses.length > 0 ? "saved" : "new")
  const savedAddressId = savedAddressOverride || defaultAddressId

  /* ─── Coverage: is the chosen address's postal code serviced? ─── */
  const activePostal =
    addressMode === "saved"
      ? addresses.find((a) => String(a.id) === savedAddressId)?.postal_code ?? ""
      : newAddress.postal_code
  const coverage = useCoverage(activePostal)
  const notServiced = coverage.data ? !coverage.data.covered : false

  /* ─── Selected service (URL param as default, user override wins) ─── */
  const preselectedValid =
    preselectedService && services.some((s) => String(s.id) === preselectedService) ? preselectedService : ""
  const serviceId = serviceIdOverride ?? preselectedValid

  /* ─── Grouped services ─── */
  const grouped = useMemo(() => {
    const map = new Map<string, ApiService[]>()
    for (const s of services) {
      const cat = s.category_name ?? "Other"
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(s)
    }
    return map
  }, [services])

  /* ─── Selected service details ─── */
  const selectedService = services.find((s) => String(s.id) === serviceId)

  /* ─── Create address mutation ─── */
  const createAddress = useMutation({
    mutationFn: () => api.post<ApiAddress>("/addresses", { address: newAddress }).then((r) => r.data),
  })

  /* ─── Create booking mutation ─── */
  const createBooking = useMutation({
    mutationFn: (payload: {
      service_id: number
      address_id: number
      requested_start: string
      kind: "scheduled"
      client_type: ClientType
      recurrence_active?: boolean
      recurrence_interval_unit?: string | null
      recurrence_interval_count?: number
      auto_charge?: boolean
      payment_timing?: "pay_upfront" | "pay_after"
      tip?: number
      gift_card_code?: string
      booked_for_name?: string
      booked_for_phone?: string
    }) =>
      api
        .post<BookingRequestResponse>("/booking_requests", { booking_request: payload })
        .then((r) => r.data),
  })

  /* ─── Out-of-area callback request ─── */
  const requestCallback = useMutation({
    mutationFn: () =>
      api.post("/callback_requests", {
        callback_request: {
          service_id: serviceId ? Number(serviceId) : undefined,
          postal_code: activePostal,
          contact_phone: bookedForPhone.trim() || undefined,
        },
      }),
    onSuccess: () =>
      setResult({
        type: "success",
        message: "Thanks! We'll call you to check for a technician near you and arrange your booking.",
      }),
  })

  /* ─── Submit ─── */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setResult(null)

    if (!serviceId || !date || !time) return

    const requestedStart = `${date}T${time}:00`

    try {
      let addrId: number

      if (addressMode === "saved") {
        addrId = Number(savedAddressId)
      } else {
        const created = await createAddress.mutateAsync()
        addrId = created.id
      }

      const freq = FREQUENCIES.find((f) => f.key === recurrence) ?? FREQUENCIES[0]
      const isRecurring = freq.key !== "none"
      const data = await createBooking.mutateAsync({
        service_id: Number(serviceId),
        address_id: addrId,
        requested_start: requestedStart,
        kind: "scheduled",
        client_type: clientType,
        recurrence_active: isRecurring,
        recurrence_interval_unit: isRecurring ? freq.unit : undefined,
        recurrence_interval_count: isRecurring ? freq.count : undefined,
        auto_charge: isRecurring && autoCharge && hasCard,
        payment_timing: payUpfront ? "pay_upfront" : "pay_after",
        tip: tip ? Number(tip) : undefined,
        gift_card_code: giftCardCode.trim() || undefined,
        booked_for_name: bookedForName.trim() || undefined,
        booked_for_phone: bookedForPhone.trim() || undefined,
      })

      // If a payment link was created (new customer / no card), send them to it.
      if (data.payment?.mode === "link" && data.payment.url) {
        window.location.href = data.payment.url
        return
      }

      const charged = data.payment?.mode === "charged"
      if (data.booking) {
        setResult({
          type: "success",
          message: charged
            ? "Your appointment is confirmed and payment was received. Thank you!"
            : "Your appointment is confirmed! An employee has been assigned.",
        })
      } else {
        setResult({ type: "success", message: "Booking request submitted. We will confirm coverage and notify you shortly." })
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string; errors?: string[] } } })?.response?.data?.error ??
        (err as { response?: { data?: { errors?: string[] } } })?.response?.data?.errors?.[0] ??
        "Something went wrong. Please try again."
      setResult({ type: "error", message: msg })
    }
  }

  const isPending = createAddress.isPending || createBooking.isPending
  const canSubmit =
    !!serviceId &&
    !!date &&
    !!time &&
    !notServiced &&
    (addressMode === "saved" ? !!savedAddressId : !!newAddress.line1 && !!newAddress.city)

  /* ─── Success screen ─── */
  if (result?.type === "success") {
    return (
      <div className="space-y-6">
        <DashboardHeader title="Booking Submitted" subtitle="We have received your request" />
        <div className="rounded-2xl border border-black/8 bg-white p-10 text-center space-y-4">
          <CheckCircle2 className="mx-auto size-14 text-[#c96c83]" />
          <h2 className="text-2xl font-extrabold text-[#101217]">You&apos;re booked!</h2>
          <p className="text-sm text-[#5f6268] max-w-md mx-auto">{result.message}</p>
          <div className="flex gap-3 justify-center pt-2">
            <Button
              onClick={() => router.push("/dashboard/customer/bookings")}
              style={{ background: "#c96c83", border: "none", color: "#fff" }}
            >
              View Bookings
            </Button>
            <Button variant="outline" onClick={() => { setResult(null); setServiceId(""); setDate(""); setTime("10:00") }}>
              Book Another
            </Button>
          </div>
        </div>

        <PwaInstallCard className="mx-auto max-w-md" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <DashboardHeader
        title="Book a Service"
        subtitle="Schedule a mobile beauty appointment at your location"
      />

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── Service ── */}
        <div className="rounded-2xl border border-black/8 bg-white p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <Sparkles className="size-4 text-[#c96c83]" />
            <h3 className="font-semibold text-sm text-[#101217]">Choose Service</h3>
          </div>

          <div className="relative">
            <select
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              required
              className="w-full h-11 appearance-none border border-black/15 rounded-xl px-4 pr-10 text-sm bg-white focus:outline-none focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20"
            >
              <option value="">Select a service…</option>
              {Array.from(grouped.entries()).map(([cat, svcs]) => (
                <optgroup key={cat} label={cat}>
                  {svcs.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — ${Number(s.price).toFixed(0)} · {s.duration_minutes}min
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-3 size-4 text-[#5f6268]" />
          </div>

          {selectedService && (
            <div className="rounded-xl bg-[#f4f1eb] px-4 py-3 text-sm text-[#5f6268] leading-6">
              {selectedService.description}
              <div className="mt-2 flex gap-4 text-xs font-semibold text-[#101217]">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="size-3.5 text-[#c96c83]" />
                  {selectedService.duration_minutes} min
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-[#c96c83]" />
                  ${Number(selectedService.prices?.[clientType] ?? selectedService.price).toFixed(0)}
                </span>
              </div>
            </div>
          )}

          {/* Who is this booking for? — sets the price tier */}
          {selectedService && (
            <div>
              <p className="text-xs font-semibold text-[#101217] mb-2">Who is this for?</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {CLIENT_TYPES.map((ct) => {
                  const active = clientType === ct.key
                  const price = Number(selectedService.prices?.[ct.key] ?? selectedService.price)
                  return (
                    <button
                      key={ct.key}
                      type="button"
                      onClick={() => setClientType(ct.key)}
                      className="rounded-xl border px-3 py-2.5 text-left transition-colors"
                      style={
                        active
                          ? { borderColor: "#c96c83", background: "#c96c8310" }
                          : { borderColor: "rgba(0,0,0,0.12)", background: "white" }
                      }
                    >
                      <span className="block text-sm font-semibold text-[#101217]">{ct.label}</span>
                      {ct.hint && <span className="block text-[10px] text-[#8a8d93]">{ct.hint}</span>}
                      <span className="block text-xs font-bold mt-0.5" style={{ color: active ? "#c96c83" : "#5f6268" }}>
                        ${price.toFixed(0)}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Date & Time ── */}
        <div className="rounded-2xl border border-black/8 bg-white p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <CalendarDays className="size-4 text-[#c96c83]" />
            <h3 className="font-semibold text-sm text-[#101217]">Date & Time</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#5f6268] mb-1.5">Date</label>
              <input
                type="date"
                value={date}
                min={TODAY}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full h-11 border border-black/15 rounded-xl px-4 text-sm focus:outline-none focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5f6268] mb-1.5">Time</label>
              <div className="relative">
                <select
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full h-11 appearance-none border border-black/15 rounded-xl px-4 pr-10 text-sm bg-white focus:outline-none focus:border-[#c96c83]"
                >
                  {TIME_SLOTS.map((slot) => (
                    <option key={slot.value} value={slot.value}>{slot.label}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-3 size-4 text-[#5f6268]" />
              </div>
            </div>
          </div>
        </div>

        {/* ── Address ── */}
        <div className="rounded-2xl border border-black/8 bg-white p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <MapPin className="size-4 text-[#c96c83]" />
            <h3 className="font-semibold text-sm text-[#101217]">Service Address</h3>
          </div>

          {addresses.length > 0 && (
            <div className="flex gap-2">
              {(["saved", "new"] as AddressMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setAddressMode(mode)}
                  className="px-4 py-1.5 rounded-full text-xs font-semibold transition-colors"
                  style={
                    addressMode === mode
                      ? { background: "#c96c83", color: "#fff" }
                      : { background: "#f4f1eb", color: "#5f6268" }
                  }
                >
                  {mode === "saved" ? "Saved address" : "New address"}
                </button>
              ))}
            </div>
          )}

          {addressMode === "saved" && addresses.length > 0 ? (
            <div className="relative">
              <select
                value={savedAddressId}
                onChange={(e) => setSavedAddressId(e.target.value)}
                required
                className="w-full h-11 appearance-none border border-black/15 rounded-xl px-4 pr-10 text-sm bg-white focus:outline-none focus:border-[#c96c83]"
              >
                {addresses.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label ? `${a.label} — ` : ""}{a.line1}, {a.city}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-3 size-4 text-[#5f6268]" />
            </div>
          ) : (
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-[#5f6268] mb-1.5">Address label (optional)</label>
                  <input
                    value={newAddress.label}
                    onChange={(e) => setNewAddress((p) => ({ ...p, label: e.target.value }))}
                    placeholder="e.g. Home, Office, Hotel"
                    className="w-full h-9 border border-black/15 rounded-lg px-3 text-sm focus:outline-none focus:border-[#c96c83]"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-[#5f6268] mb-1.5">Street address *</label>
                  <input
                    value={newAddress.line1}
                    onChange={(e) => setNewAddress((p) => ({ ...p, line1: e.target.value }))}
                    placeholder="123 Main St"
                    required={addressMode === "new"}
                    className="w-full h-9 border border-black/15 rounded-lg px-3 text-sm focus:outline-none focus:border-[#c96c83]"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-[#5f6268] mb-1.5">Apt / Suite (optional)</label>
                  <input
                    value={newAddress.line2}
                    onChange={(e) => setNewAddress((p) => ({ ...p, line2: e.target.value }))}
                    placeholder="Unit 4B"
                    className="w-full h-9 border border-black/15 rounded-lg px-3 text-sm focus:outline-none focus:border-[#c96c83]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#5f6268] mb-1.5">City *</label>
                  <input
                    value={newAddress.city}
                    onChange={(e) => setNewAddress((p) => ({ ...p, city: e.target.value }))}
                    placeholder="Toronto"
                    required={addressMode === "new"}
                    className="w-full h-9 border border-black/15 rounded-lg px-3 text-sm focus:outline-none focus:border-[#c96c83]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#5f6268] mb-1.5">Province</label>
                  <div className="relative">
                    <select
                      value={newAddress.province}
                      onChange={(e) => setNewAddress((p) => ({ ...p, province: e.target.value }))}
                      className="w-full h-9 appearance-none border border-black/15 rounded-lg px-3 pr-8 text-sm bg-white focus:outline-none focus:border-[#c96c83]"
                    >
                      {PROVINCES.map((p) => <option key={p}>{p}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-2.5 size-3.5 text-[#5f6268]" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#5f6268] mb-1.5">Postal code</label>
                  <input
                    value={newAddress.postal_code}
                    onChange={(e) => setNewAddress((p) => ({ ...p, postal_code: e.target.value.toUpperCase() }))}
                    placeholder="M5V 1A1"
                    maxLength={7}
                    className="w-full h-9 border border-black/15 rounded-lg px-3 text-sm focus:outline-none focus:border-[#c96c83]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Coverage status — matches on the FSA (first 3 characters) */}
          {activePostal.replace(/[^A-Za-z0-9]/g, "").length >= 3 && (
            <div className="mt-4">
              {coverage.isLoading ? (
                <p className="text-xs text-[#5f6268]">Checking coverage…</p>
              ) : coverage.isError ? (
                <p className="text-xs text-[#d4754a]">Enter a valid postal code to check coverage.</p>
              ) : coverage.data?.covered ? (
                <div className="flex items-center gap-2 rounded-lg bg-[#5a9e5a]/10 px-3 py-2 text-xs font-medium text-[#3f7a3f]">
                  <CheckCircle2 className="size-4 shrink-0" />
                  {coverage.data.unrestricted
                    ? "We serve this location."
                    : `We serve ${coverage.data.fsa}${coverage.data.providers.length ? ` — ${coverage.data.providers.join(", ")}` : ""}.`}
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-lg bg-[#d4754a]/10 px-3 py-2 text-xs font-medium text-[#b3542a]">
                  <X className="size-4 shrink-0" />
                  Sorry, we don&apos;t serve {coverage.data?.fsa ?? "this area"} yet. Try a different address.
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Recurrence ── */}
        <div className="rounded-2xl border border-black/8 bg-white p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <CalendarDays className="size-4 text-[#c96c83]" />
            <h3 className="font-semibold text-sm text-[#101217]">Make it a subscription</h3>
          </div>
          <p className="text-xs text-[#5f6268] -mt-2">
            We&apos;ll automatically rebook this service on your chosen schedule. Manage,
            pause, or cancel anytime from Subscriptions.
          </p>

          <div className="flex gap-2 flex-wrap">
            {FREQUENCIES.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setRecurrence(opt.key)}
                className="px-4 py-1.5 rounded-full text-xs font-semibold transition-colors"
                style={
                  recurrence === opt.key
                    ? { background: "#c96c83", color: "#fff" }
                    : { background: "#f4f1eb", color: "#5f6268" }
                }
              >
                {opt.label}
              </button>
            ))}
          </div>

          {recurrence !== "none" && (
            hasCard ? (
              <label className="flex items-start gap-2.5 rounded-xl bg-[#f4f1eb] px-4 py-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoCharge}
                  onChange={(e) => setAutoCharge(e.target.checked)}
                  className="mt-0.5 size-4 accent-[#c96c83]"
                />
                <span className="text-xs text-[#5f6268] leading-5">
                  Automatically charge my card on file for each recurring appointment.
                </span>
              </label>
            ) : (
              <p className="rounded-xl bg-[#f4f1eb] px-4 py-3 text-xs text-[#5f6268] leading-5">
                Add a card in{" "}
                <a href="/dashboard/customer/settings" className="font-semibold text-[#c96c83] underline">
                  Settings
                </a>{" "}
                to enable automatic payment for recurring bookings.
              </p>
            )
          )}
        </div>

        {/* ── Payment & tip ── */}
        <div className="space-y-3">
          <p className="text-sm font-semibold text-[#101217]">Payment</p>
          <div className="flex gap-2 flex-wrap">
            {[
              { key: false, label: "Pay after service" },
              { key: true, label: "Pay now" },
            ].map((opt) => (
              <button
                key={String(opt.key)}
                type="button"
                onClick={() => setPayUpfront(opt.key)}
                className="px-4 py-1.5 rounded-full text-xs font-semibold transition-colors"
                style={
                  payUpfront === opt.key
                    ? { background: "#c96c83", color: "#fff" }
                    : { background: "#f4f1eb", color: "#5f6268" }
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
          {clientType === "group" && (
            <p className="rounded-xl bg-[#f4f1eb] px-4 py-3 text-xs text-[#5f6268] leading-5">
              Group bookings require a deposit, collected now. The balance is due after service.
            </p>
          )}
          <div>
            <label className="text-xs text-[#5f6268]">Add a tip for your technician (optional)</label>
            <input
              type="number" min="0" step="1" inputMode="decimal" placeholder="$0"
              value={tip} onChange={(e) => setTip(e.target.value)}
              className="mt-1 w-full h-10 border border-black/15 rounded-lg px-3 text-sm focus:outline-none focus:border-[#c96c83]"
            />
          </div>
          <div>
            <label className="text-xs text-[#5f6268]">Gift card code (optional)</label>
            <input
              placeholder="BAYD-…"
              value={giftCardCode}
              onChange={(e) => setGiftCardCode(e.target.value)}
              className="mt-1 w-full h-10 border border-black/15 rounded-lg px-3 text-sm focus:outline-none focus:border-[#c96c83]"
            />
            <p className="mt-1 text-[11px] text-[#8a8d93] leading-4">
              Its balance is applied first; anything remaining is charged as above.
            </p>
          </div>
          <p className="text-[11px] text-[#8a8d93] leading-4">
            {hasCard
              ? "We'll charge your card on file."
              : "We'll email you a secure payment link to complete payment."}
          </p>
        </div>

        {/* ── Booking for someone else ── */}
        <div className="space-y-2">
          <p className="text-sm font-semibold text-[#101217]">Booking for someone else? (optional)</p>
          <div className="grid grid-cols-2 gap-2">
            <input
              placeholder="Their name" value={bookedForName} onChange={(e) => setBookedForName(e.target.value)}
              className="h-10 border border-black/15 rounded-lg px-3 text-sm focus:outline-none focus:border-[#c96c83]"
            />
            <input
              placeholder="Their phone" value={bookedForPhone} onChange={(e) => setBookedForPhone(e.target.value)}
              className="h-10 border border-black/15 rounded-lg px-3 text-sm focus:outline-none focus:border-[#c96c83]"
            />
          </div>
        </div>

        {/* ── Error ── */}
        {result?.type === "error" && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <X className="size-4 text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-700">{result.message}</p>
          </div>
        )}

        {/* ── Out-of-area: no dead end — offer a callback ── */}
        {notServiced ? (
          <div className="space-y-3 rounded-xl border border-[#c96c83]/30 bg-[#f4f1eb] px-4 py-4">
            <p className="text-sm text-[#101217]">
              We don&apos;t have a technician in your area yet. Call us and we&apos;ll check for someone nearby.
            </p>
            <div className="flex gap-2 flex-wrap">
              {COMPANY_PHONE && (
                <a
                  href={`tel:${COMPANY_PHONE}`}
                  className="px-4 h-10 inline-flex items-center rounded-xl text-sm font-semibold"
                  style={{ background: "#c96c83", color: "#fff" }}
                >
                  Call {COMPANY_PHONE}
                </a>
              )}
              <Button
                type="button"
                onClick={() => requestCallback.mutate()}
                disabled={requestCallback.isPending || !activePostal}
                className="h-10 rounded-xl text-sm font-semibold"
                style={{ background: "#fff", border: "1px solid #c96c83", color: "#c96c83" }}
              >
                {requestCallback.isPending ? "Sending…" : "Request a callback"}
              </Button>
            </div>
          </div>
        ) : (
          /* ── Submit ── */
          <Button
            type="submit"
            disabled={!canSubmit || isPending}
            className="w-full h-12 text-base font-bold rounded-xl"
            style={{ background: "#c96c83", border: "none", color: "#fff" }}
          >
            {isPending ? "Submitting…" : payUpfront ? "Confirm & Pay" : "Confirm Booking"}
          </Button>
        )}
      </form>
    </div>
  )
}

export default function CustomerBookPage() {
  return (
    <Suspense fallback={null}>
      <CustomerBookPageContent />
    </Suspense>
  )
}
