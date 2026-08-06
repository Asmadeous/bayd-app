"use client"

import { useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useMutation, useQuery } from "@tanstack/react-query"
import { CalendarDays, CheckCircle2, Clock, MapPin, Sparkles, X } from "lucide-react"

import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardPage } from "@/components/dashboard/dashboard-page"
import { DashboardPanel } from "@/components/dashboard/dashboard-panel"
import { PwaInstallCard } from "@/components/pwa-install-card"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import api from "@/lib/api"
import { cn } from "@/lib/utils"

/* ─── API shapes ─── */
interface ApiService {
  id: number
  name: string
  description: string | null
  duration_minutes: number
  price: string
  category_name: string | null
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
  error?: string
}

/* ─── Helpers ─── */
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

const fieldClass =
  "h-11 w-full border border-black/15 bg-white px-3 text-sm font-semibold text-[#101217] outline-none transition-colors placeholder:text-[#8a8d93] focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20"
const labelClass = "mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-[#6b6f76]"
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

/* ─── Component ─── */
export default function CustomerBookPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedService = searchParams.get("service")
  const preselectedDate = searchParams.get("date")

  const [serviceId, setServiceId] = useState("")
  const [date, setDate] = useState(() => getBookableDate(preselectedDate) ?? "")
  const [time, setTime] = useState("10:00")
  const [addressMode, setAddressMode] = useState<AddressMode>("saved")
  const [savedAddressId, setSavedAddressId] = useState("")
  const [newAddress, setNewAddress] = useState(BLANK_ADDRESS)
  const [recurrence, setRecurrence] = useState<string>("none")
  const [autoCharge, setAutoCharge] = useState(false)
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

  const preselectedServiceId =
    services.find((service) => String(service.id) === preselectedService)?.id ?? null
  const effectiveServiceId = serviceId || (preselectedServiceId ? String(preselectedServiceId) : "")
  const defaultSavedAddressId = String(
    addresses.find((address) => (address as unknown as { default: boolean }).default)?.id ??
      addresses[0]?.id ??
      "",
  )
  const effectiveAddressMode: AddressMode = addresses.length > 0 ? addressMode : "new"
  const effectiveSavedAddressId = savedAddressId || defaultSavedAddressId

  /* ─── Selected service details ─── */
  const selectedService = services.find((service) => String(service.id) === effectiveServiceId)

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
      recurrence_active?: boolean
      recurrence_interval_unit?: string | null
      recurrence_interval_count?: number
      auto_charge?: boolean
    }) =>
      api
        .post<BookingRequestResponse>("/booking_requests", { booking_request: payload })
        .then((r) => r.data),
  })

  /* ─── Submit ─── */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setResult(null)

    if (!effectiveServiceId || !date || !time) return

    const requestedStart = `${date}T${time}:00`

    try {
      let addrId: number

      if (effectiveAddressMode === "saved") {
        addrId = Number(effectiveSavedAddressId)
      } else {
        const created = await createAddress.mutateAsync()
        addrId = created.id
      }

      const freq = FREQUENCIES.find((f) => f.key === recurrence) ?? FREQUENCIES[0]
      const isRecurring = freq.key !== "none"
      const data = await createBooking.mutateAsync({
        service_id: Number(effectiveServiceId),
        address_id: addrId,
        requested_start: requestedStart,
        kind: "scheduled",
        recurrence_active: isRecurring,
        recurrence_interval_unit: isRecurring ? freq.unit : undefined,
        recurrence_interval_count: isRecurring ? freq.count : undefined,
        auto_charge: isRecurring && autoCharge && hasCard,
      })

      if (data.booking) {
        setResult({ type: "success", message: "Your appointment is confirmed! An employee has been assigned." })
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
  const isTimeValid = TIME_PATTERN.test(time)
  const canSubmit =
    !!effectiveServiceId &&
    !!date &&
    isTimeValid &&
    (effectiveAddressMode === "saved"
      ? !!effectiveSavedAddressId
      : !!newAddress.line1 && !!newAddress.city)
  const formHint = getBookingFormHint({
    hasAddress: effectiveAddressMode === "saved"
      ? !!effectiveSavedAddressId
      : !!newAddress.line1 && !!newAddress.city,
    hasDate: !!date,
    hasService: !!effectiveServiceId,
    isTimeValid,
  })

  /* ─── Success screen ─── */
  if (result?.type === "success") {
    return (
      <DashboardPage>
        <DashboardHeader title="Booking Submitted" subtitle="We have received your request." />
        <DashboardPanel className="space-y-4 text-center" padding="lg">
          <CheckCircle2 aria-hidden="true" className="mx-auto size-14 text-[#c96c83]" />
          <h2 className="text-2xl font-extrabold text-[#101217]">You&apos;re booked!</h2>
          <p className="mx-auto max-w-md text-sm leading-6 text-[#5f6268]">{result.message}</p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Button
              onClick={() => router.push("/dashboard/customer/bookings")}
              style={{ background: "#c96c83", border: "none", color: "#fff" }}
            >
              View Bookings
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setResult(null)
                setServiceId("")
                setDate("")
                setTime("10:00")
              }}
            >
              Book Another
            </Button>
          </div>
        </DashboardPanel>

        <PwaInstallCard className="mx-auto max-w-md" />
      </DashboardPage>
    )
  }

  return (
    <DashboardPage maxWidth="wide">
      <DashboardHeader
        title="Book a Service"
        subtitle="Schedule a mobile beauty appointment at your location."
      />

      <form className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]" onSubmit={handleSubmit}>
        <div className="space-y-6">

        {/* ── Service ── */}
        <DashboardPanel className="space-y-4">
          <div className="flex items-center gap-2.5">
            <Sparkles aria-hidden="true" className="size-4 text-[#c96c83]" />
            <h3 className="text-sm font-extrabold uppercase tracking-[0.14em] text-[#101217]">
              Choose Service
            </h3>
          </div>

          <div>
            <Select
              value={effectiveServiceId}
              onValueChange={(value) => setServiceId(value ?? "")}
              required
            >
              <SelectTrigger className="h-11 px-4">
                <span className={selectedService ? "truncate" : "truncate text-[#5f6268]"}>
                  {selectedService
                    ? `${selectedService.name} - $${Number(selectedService.price).toFixed(0)} / ${selectedService.duration_minutes}min`
                    : "Select a service..."}
                </span>
              </SelectTrigger>
              <SelectContent>
                {Array.from(grouped.entries()).map(([cat, svcs]) => (
                  <div key={cat}>
                    <div className="px-3 py-2 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[#a36f4d]">
                      {cat}
                    </div>
                    {svcs.map((service) => (
                      <SelectItem key={service.id} value={String(service.id)}>
                        {service.name} - ${Number(service.price).toFixed(0)} /{" "}
                        {service.duration_minutes}min
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedService && (
            <div className="border border-black/8 bg-[#fbfaf7] px-4 py-4 text-sm leading-6 text-[#5f6268]">
              {selectedService.description || "A tailored mobile beauty service at your location."}
              <div className="mt-2 flex gap-4 text-xs font-semibold text-[#101217]">
                <span className="inline-flex items-center gap-1.5">
                  <Clock aria-hidden="true" className="size-3.5 text-[#c96c83]" />
                  {selectedService.duration_minutes} min
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Sparkles aria-hidden="true" className="size-3.5 text-[#c96c83]" />
                  ${Number(selectedService.price).toFixed(0)}+
                </span>
              </div>
            </div>
          )}
        </DashboardPanel>

        {/* ── Date & Time ── */}
        <DashboardPanel className="space-y-4">
          <div className="flex items-center gap-2.5">
            <CalendarDays aria-hidden="true" className="size-4 text-[#c96c83]" />
            <h3 className="text-sm font-extrabold uppercase tracking-[0.14em] text-[#101217]">
              Date & Time
            </h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Date</label>
              <DatePicker min={TODAY} value={date} onChange={setDate} />
            </div>
            <div>
              <label className={labelClass}>Time</label>
              <input
                className={fieldClass}
                max="23:59"
                min="00:00"
                onChange={(event) => setTime(event.target.value)}
                step={60}
                type="time"
                value={time}
              />
              {!isTimeValid ? (
                <p className="mt-2 text-xs font-semibold text-red-700">
                  Enter a valid time, for example 10:23.
                </p>
              ) : null}
            </div>
          </div>
        </DashboardPanel>

        {/* ── Address ── */}
        <DashboardPanel className="space-y-4">
          <div className="flex items-center gap-2.5">
            <MapPin aria-hidden="true" className="size-4 text-[#c96c83]" />
            <h3 className="text-sm font-extrabold uppercase tracking-[0.14em] text-[#101217]">
              Service Address
            </h3>
          </div>

          {addresses.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {(["saved", "new"] as AddressMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setAddressMode(mode)}
                  className={cn(
                    "border px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] transition-colors",
                    effectiveAddressMode === mode
                      ? "border-[#c96c83] bg-[#c96c83] text-white"
                      : "border-black/8 bg-[#fbfaf7] text-[#5f6268] hover:border-[#c96c83]/35"
                  )}
                >
                  {mode === "saved" ? "Saved address" : "New address"}
                </button>
              ))}
            </div>
          )}

          {effectiveAddressMode === "saved" && addresses.length > 0 ? (
            <div>
              <Select
                value={effectiveSavedAddressId}
                onValueChange={(value) => setSavedAddressId(value ?? "")}
                required
              >
                <SelectTrigger className="h-11 px-4">
                  <SelectValue placeholder="Select a saved address" />
                </SelectTrigger>
                <SelectContent>
                  {addresses.map((address) => (
                    <SelectItem key={address.id} value={String(address.id)}>
                      {address.label ? `${address.label} - ` : ""}
                      {address.line1}, {address.city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={labelClass}>Address label (optional)</label>
                  <input
                    value={newAddress.label}
                    onChange={(e) => setNewAddress((p) => ({ ...p, label: e.target.value }))}
                    placeholder="e.g. Home, Office, Hotel"
                    className={fieldClass}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Street address *</label>
                  <input
                    value={newAddress.line1}
                    onChange={(e) => setNewAddress((p) => ({ ...p, line1: e.target.value }))}
                    placeholder="123 Main St"
                    required={effectiveAddressMode === "new"}
                    className={fieldClass}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Apt / Suite (optional)</label>
                  <input
                    value={newAddress.line2}
                    onChange={(e) => setNewAddress((p) => ({ ...p, line2: e.target.value }))}
                    placeholder="Unit 4B"
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>City *</label>
                  <input
                    value={newAddress.city}
                    onChange={(e) => setNewAddress((p) => ({ ...p, city: e.target.value }))}
                    placeholder="Toronto"
                    required={effectiveAddressMode === "new"}
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Province</label>
                  <div>
                    <Select
                      value={newAddress.province}
                      onValueChange={(value) =>
                        setNewAddress((current) => ({ ...current, province: value ?? "ON" }))
                      }
                      >
                        <SelectTrigger className="h-11 px-3">
                        <SelectValue placeholder="Select province" />
                      </SelectTrigger>
                      <SelectContent>
                        {PROVINCES.map((province) => (
                          <SelectItem key={province} value={province}>
                            {province}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Postal code</label>
                  <input
                    value={newAddress.postal_code}
                    onChange={(e) => setNewAddress((p) => ({ ...p, postal_code: e.target.value.toUpperCase() }))}
                    placeholder="M5V 1A1"
                    maxLength={7}
                    className={fieldClass}
                  />
                </div>
              </div>
            </div>
          )}
        </DashboardPanel>

        {/* ── Recurrence ── */}
        <DashboardPanel className="space-y-4">
          <div className="flex items-center gap-2.5">
            <CalendarDays aria-hidden="true" className="size-4 text-[#c96c83]" />
            <h3 className="text-sm font-extrabold uppercase tracking-[0.14em] text-[#101217]">
              Make it a subscription
            </h3>
          </div>
          <p className="-mt-2 text-xs leading-5 text-[#5f6268]">
            We&apos;ll automatically rebook this service on your chosen schedule. Manage,
            pause, or cancel anytime from Subscriptions.
          </p>

          <div className="flex flex-wrap gap-2">
            {FREQUENCIES.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setRecurrence(opt.key)}
                className={cn(
                  "border px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] transition-colors",
                  recurrence === opt.key
                    ? "border-[#c96c83] bg-[#c96c83] text-white"
                    : "border-black/8 bg-[#fbfaf7] text-[#5f6268] hover:border-[#c96c83]/35"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {recurrence !== "none" && (
            hasCard ? (
              <label className="flex cursor-pointer items-start gap-2.5 border border-black/8 bg-[#fbfaf7] px-4 py-3">
                <input
                  type="checkbox"
                  checked={autoCharge}
                  onChange={(e) => setAutoCharge(e.target.checked)}
                  className="mt-0.5 size-4 accent-[#c96c83]"
                />
                <span className="text-xs leading-5 text-[#5f6268]">
                  Automatically charge my card on file for each recurring appointment.
                </span>
              </label>
            ) : (
              <p className="border border-black/8 bg-[#fbfaf7] px-4 py-3 text-xs leading-5 text-[#5f6268]">
                Add a card in{" "}
                <a href="/dashboard/customer/settings" className="font-bold text-[#c96c83] underline">
                  Settings
                </a>{" "}
                to enable automatic payment for recurring bookings.
              </p>
            )
          )}
        </DashboardPanel>

        </div>

        <div className="space-y-6">
          <DashboardPanel className="space-y-4" tone="warm">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a36f4d]">
                Booking summary
              </p>
              <h3 className="mt-1 text-lg font-extrabold text-[#101217]">
                {selectedService?.name ?? "Choose your service"}
              </h3>
            </div>
            <div className="space-y-3 border-t border-black/8 pt-4 text-sm text-[#5f6268]">
              <p className="flex items-center justify-between gap-3">
                <span>Date</span>
                <span className="font-bold text-[#101217]">{date || "Not selected"}</span>
              </p>
              <p className="flex items-center justify-between gap-3">
                <span>Time</span>
                <span className="font-bold text-[#101217]">{time || "Not selected"}</span>
              </p>
              <p className="flex items-center justify-between gap-3">
                <span>Price</span>
                <span className="font-bold text-[#101217]">
                  {selectedService ? `$${Number(selectedService.price).toFixed(0)}+` : "-"}
                </span>
              </p>
            </div>

            {isPending ? (
              <BookingFeedback
                icon={Clock}
                message="Submitting your booking request. Please keep this page open."
                tone="info"
              />
            ) : result?.type === "error" ? (
              <BookingFeedback icon={X} message={result.message} tone="error" />
            ) : formHint ? (
              <BookingFeedback icon={CalendarDays} message={formHint} tone="info" />
            ) : null}

            <Button
              type="submit"
              disabled={!canSubmit || isPending}
              className="h-12 w-full text-base font-bold"
              style={{ background: "#c96c83", border: "none", color: "#fff" }}
            >
              {isPending ? "Submitting..." : "Confirm Booking"}
            </Button>
          </DashboardPanel>

          <PwaInstallCard />
        </div>
      </form>
    </DashboardPage>
  )
}

function BookingFeedback({
  icon: Icon,
  message,
  tone,
}: {
  icon: typeof CalendarDays
  message: string
  tone: "error" | "info"
}) {
  return (
    <div
      aria-live="polite"
      className={
        tone === "error"
          ? "flex items-start gap-3 border border-red-200 bg-red-50 px-4 py-3"
          : "flex items-start gap-3 border border-[#c96c83]/20 bg-white px-4 py-3"
      }
    >
      <Icon
        aria-hidden="true"
        className={
          tone === "error"
            ? "mt-0.5 size-4 shrink-0 text-red-500"
            : "mt-0.5 size-4 shrink-0 text-[#c96c83]"
        }
      />
      <p className={tone === "error" ? "text-sm text-red-700" : "text-sm leading-6 text-[#5f6268]"}>
        {message}
      </p>
    </div>
  )
}

function getBookingFormHint({
  hasAddress,
  hasDate,
  hasService,
  isTimeValid,
}: {
  hasAddress: boolean
  hasDate: boolean
  hasService: boolean
  isTimeValid: boolean
}) {
  const missing: string[] = []
  if (!hasService) missing.push("service")
  if (!hasDate) missing.push("date")
  if (!isTimeValid) missing.push("valid time")
  if (!hasAddress) missing.push("service address")

  if (missing.length === 0) return null
  return `Complete ${formatList(missing)} to continue.`
}

function formatList(items: string[]) {
  if (items.length === 1) return `the ${items[0]}`
  if (items.length === 2) return `the ${items[0]} and ${items[1]}`
  return `the ${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`
}

function getBookableDate(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  if (value < TODAY) return null

  const [year, month, day] = value.split("-").map(Number)
  const parsed = new Date(year, month - 1, day)
  const isValidDate =
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day

  return isValidDate ? value : null
}
