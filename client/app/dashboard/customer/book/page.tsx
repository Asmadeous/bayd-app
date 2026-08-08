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
import { useCoverage } from "@/lib/hooks/use-coverage"
import { useAuthStore } from "@/lib/stores/auth-store"
import { siteConfig } from "@/lib/site"
import { cn } from "@/lib/utils"

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
  prices?: Partial<Record<ClientType, string>>
  group_size?: number
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

const COMPANY_PHONE = siteConfig.phone
const COMPANY_PHONE_HREF = siteConfig.phoneHref
const TODAY = new Date().toISOString().split("T")[0]
const PROVINCES = [
  "AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT",
]

type AddressMode = "saved" | "new"

const BLANK_ADDRESS = { label: "", line1: "", line2: "", city: "", province: "ON", postal_code: "" }
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
  const [newAddress, setNewAddress] = useState(() => {
    const user = useAuthStore.getState().user

    return {
      ...BLANK_ADDRESS,
      line1: user?.street_address ?? "",
      city: user?.city ?? "",
      postal_code: user?.postal_code ?? "",
    }
  })
  const [clientType, setClientType] = useState<ClientType>("adult")
  const [recurrence, setRecurrence] = useState<string>("none")
  const [autoCharge, setAutoCharge] = useState(false)
  const [payUpfront, setPayUpfront] = useState(false)
  const [tip, setTip] = useState("")
  const [giftCardCode, setGiftCardCode] = useState("")
  const [bookedForName, setBookedForName] = useState("")
  const [bookedForPhone, setBookedForPhone] = useState("")
  const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null)

  const { data: me } = useQuery<{ has_card_on_file: boolean }>({
    queryKey: ["auth-me-card"],
    queryFn: () => api.get<{ has_card_on_file: boolean }>("/auth/me").then((r) => r.data),
  })
  const hasCard = me?.has_card_on_file ?? false

  const { data: services = [] } = useQuery<ApiService[]>({
    queryKey: ["booking-services"],
    queryFn: () => api.get<ApiService[]>("/services").then((r) => r.data),
  })

  const { data: addresses = [] } = useQuery<ApiAddress[]>({
    queryKey: ["user-addresses"],
    queryFn: () => api.get<ApiAddress[]>("/addresses").then((r) => r.data),
  })

  const grouped = useMemo(() => {
    const map = new Map<string, ApiService[]>()

    for (const service of services) {
      const category = service.category_name ?? "Other"
      if (!map.has(category)) map.set(category, [])
      map.get(category)!.push(service)
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
  const selectedService = services.find((service) => String(service.id) === effectiveServiceId)
  const selectedPrice = selectedService
    ? Number(selectedService.prices?.[clientType] ?? selectedService.price)
    : null
  const activePostal =
    effectiveAddressMode === "saved"
      ? addresses.find((address) => String(address.id) === effectiveSavedAddressId)?.postal_code ?? ""
      : newAddress.postal_code
  const coverage = useCoverage(activePostal)
  const notServiced = coverage.data ? !coverage.data.covered : false

  const createAddress = useMutation({
    mutationFn: () => api.post<ApiAddress>("/addresses", { address: newAddress }).then((r) => r.data),
  })

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

  const requestCallback = useMutation({
    mutationFn: () =>
      api.post("/callback_requests", {
        callback_request: {
          service_id: effectiveServiceId ? Number(effectiveServiceId) : undefined,
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setResult(null)

    if (!effectiveServiceId || !date || !time || notServiced) return

    const requestedStart = `${date}T${time}:00`

    try {
      const addressId =
        effectiveAddressMode === "saved"
          ? Number(effectiveSavedAddressId)
          : (await createAddress.mutateAsync()).id
      const freq = FREQUENCIES.find((frequency) => frequency.key === recurrence) ?? FREQUENCIES[0]
      const isRecurring = freq.key !== "none"
      const data = await createBooking.mutateAsync({
        service_id: Number(effectiveServiceId),
        address_id: addressId,
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
  const isTimeValid = TIME_PATTERN.test(time)
  const canSubmit =
    !!effectiveServiceId &&
    !!date &&
    isTimeValid &&
    !notServiced &&
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
    isServiced: !notServiced,
  })

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
          <DashboardPanel className="space-y-4">
            <div className="flex items-center gap-2.5">
              <Sparkles aria-hidden="true" className="size-4 text-[#c96c83]" />
              <h3 className="text-sm font-extrabold uppercase tracking-[0.14em] text-[#101217]">
                Choose Service
              </h3>
            </div>

            <Select
              value={effectiveServiceId}
              onValueChange={(value) => setServiceId(value ?? "")}
              required
            >
              <SelectTrigger className="h-11 px-4">
                <span className={selectedService ? "truncate" : "truncate text-[#5f6268]"}>
                  {selectedService
                    ? `${selectedService.name} - $${selectedPrice?.toFixed(0)} / ${selectedService.duration_minutes}min`
                    : "Select a service..."}
                </span>
              </SelectTrigger>
              <SelectContent>
                {Array.from(grouped.entries()).map(([category, categoryServices]) => (
                  <div key={category}>
                    <div className="px-3 py-2 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[#a36f4d]">
                      {category}
                    </div>
                    {categoryServices.map((service) => (
                      <SelectItem key={service.id} value={String(service.id)}>
                        {service.name} - ${Number(service.price).toFixed(0)} /{" "}
                        {service.duration_minutes}min
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>

            {selectedService ? (
              <div className="border border-black/8 bg-[#fbfaf7] px-4 py-4 text-sm leading-6 text-[#5f6268]">
                {selectedService.description || "A tailored mobile beauty service at your location."}
                <div className="mt-2 flex gap-4 text-xs font-semibold text-[#101217]">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock aria-hidden="true" className="size-3.5 text-[#c96c83]" />
                    {selectedService.duration_minutes} min
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Sparkles aria-hidden="true" className="size-3.5 text-[#c96c83]" />
                    ${selectedPrice?.toFixed(0)}
                  </span>
                </div>
              </div>
            ) : null}

            {selectedService ? (
              <div>
                <p className={labelClass}>Who is this for?</p>
                <div className="grid gap-2 sm:grid-cols-4">
                  {CLIENT_TYPES.map((type) => {
                    const active = clientType === type.key
                    const price = Number(selectedService.prices?.[type.key] ?? selectedService.price)

                    return (
                      <button
                        className={cn(
                          "border px-3 py-3 text-left text-xs transition-colors",
                          active
                            ? "border-[#c96c83] bg-[#c96c83]/10 text-[#101217]"
                            : "border-black/8 bg-white text-[#5f6268] hover:border-[#c96c83]/35",
                        )}
                        key={type.key}
                        onClick={() => setClientType(type.key)}
                        type="button"
                      >
                        <span className="block text-sm font-bold">{type.label}</span>
                        {type.hint ? <span className="mt-0.5 block text-[0.68rem]">{type.hint}</span> : null}
                        <span className="mt-1 block font-extrabold text-[#c96c83]">${price.toFixed(0)}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : null}
          </DashboardPanel>

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

          <DashboardPanel className="space-y-4">
            <div className="flex items-center gap-2.5">
              <MapPin aria-hidden="true" className="size-4 text-[#c96c83]" />
              <h3 className="text-sm font-extrabold uppercase tracking-[0.14em] text-[#101217]">
                Service Address
              </h3>
            </div>

            {addresses.length > 0 ? (
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
                        : "border-black/8 bg-[#fbfaf7] text-[#5f6268] hover:border-[#c96c83]/35",
                    )}
                  >
                    {mode === "saved" ? "Saved address" : "New address"}
                  </button>
                ))}
              </div>
            ) : null}

            {effectiveAddressMode === "saved" && addresses.length > 0 ? (
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

            {activePostal.replace(/[^A-Za-z0-9]/g, "").length >= 3 ? (
              <div>
                {coverage.isLoading ? (
                  <BookingFeedback icon={Clock} message="Checking service coverage..." tone="info" />
                ) : coverage.isError ? (
                  <BookingFeedback icon={X} message="Enter a valid postal code to check coverage." tone="error" />
                ) : coverage.data?.covered ? (
                  <BookingFeedback
                    icon={CheckCircle2}
                    message={
                      coverage.data.unrestricted
                        ? "We serve this location."
                        : `We serve ${coverage.data.fsa}${coverage.data.providers.length ? ` - ${coverage.data.providers.join(", ")}` : ""}.`
                    }
                    tone="success"
                  />
                ) : (
                  <BookingFeedback
                    icon={X}
                    message={`Sorry, we do not serve ${coverage.data?.fsa ?? "this area"} yet. Request a callback and we will check nearby coverage.`}
                    tone="error"
                  />
                )}
              </div>
            ) : null}
          </DashboardPanel>

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
                      : "border-black/8 bg-[#fbfaf7] text-[#5f6268] hover:border-[#c96c83]/35",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {recurrence !== "none" ? (
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
            ) : null}
          </DashboardPanel>

          <DashboardPanel className="space-y-4">
            <h3 className="text-sm font-extrabold uppercase tracking-[0.14em] text-[#101217]">
              Booking for someone else?
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                placeholder="Their name"
                value={bookedForName}
                onChange={(e) => setBookedForName(e.target.value)}
                className={fieldClass}
              />
              <input
                placeholder="Their phone"
                value={bookedForPhone}
                onChange={(e) => setBookedForPhone(e.target.value)}
                className={fieldClass}
              />
            </div>
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
                <span>Client</span>
                <span className="font-bold text-[#101217]">
                  {CLIENT_TYPES.find((type) => type.key === clientType)?.label}
                </span>
              </p>
              <p className="flex items-center justify-between gap-3">
                <span>Price</span>
                <span className="font-bold text-[#101217]">
                  {selectedPrice !== null ? `$${selectedPrice.toFixed(0)}+` : "-"}
                </span>
              </p>
            </div>

            <div className="space-y-3 border-t border-black/8 pt-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#6b6f76]">Payment</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: false, label: "Pay after service" },
                  { key: true, label: "Pay now" },
                ].map((option) => (
                  <button
                    key={String(option.key)}
                    type="button"
                    onClick={() => setPayUpfront(option.key)}
                    className={cn(
                      "border px-3 py-2 text-xs font-bold uppercase tracking-[0.1em] transition-colors",
                      payUpfront === option.key
                        ? "border-[#c96c83] bg-[#c96c83] text-white"
                        : "border-black/8 bg-white text-[#5f6268] hover:border-[#c96c83]/35",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {clientType === "group" ? (
                <p className="border border-black/8 bg-white px-3 py-2 text-xs leading-5 text-[#5f6268]">
                  Group bookings require a deposit, collected now. The balance is due after service.
                </p>
              ) : null}
              <div>
                <label className={labelClass}>Tip for technician (optional)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  inputMode="decimal"
                  placeholder="$0"
                  value={tip}
                  onChange={(e) => setTip(e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={labelClass}>Gift card code (optional)</label>
                <input
                  placeholder="BAYD-..."
                  value={giftCardCode}
                  onChange={(e) => setGiftCardCode(e.target.value)}
                  className={fieldClass}
                />
                <p className="mt-1 text-[11px] leading-4 text-[#8a8d93]">
                  Its balance is applied first; anything remaining is charged as above.
                </p>
              </div>
              <p className="text-[11px] leading-4 text-[#8a8d93]">
                {hasCard
                  ? "We'll charge your card on file."
                  : "We'll email you a secure payment link to complete payment."}
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

            {notServiced ? (
              <div className="space-y-3 border border-[#c96c83]/30 bg-white px-4 py-4">
                <p className="text-sm leading-6 text-[#101217]">
                  We don&apos;t have a technician in your area yet. Call us and we&apos;ll check for someone nearby.
                </p>
                <div className="flex flex-wrap gap-2">
                  {COMPANY_PHONE ? (
                    <a
                      href={`tel:${COMPANY_PHONE_HREF}`}
                      className="inline-flex h-10 items-center px-4 text-sm font-bold text-white"
                      style={{ background: "#c96c83" }}
                    >
                      Call {COMPANY_PHONE}
                    </a>
                  ) : null}
                  <Button
                    type="button"
                    onClick={() => requestCallback.mutate()}
                    disabled={requestCallback.isPending || !activePostal}
                    className="h-10 text-sm font-bold"
                    variant="outline"
                  >
                    {requestCallback.isPending ? "Sending..." : "Request callback"}
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="submit"
                disabled={!canSubmit || isPending}
                className="h-12 w-full text-base font-bold"
                style={{ background: "#c96c83", border: "none", color: "#fff" }}
              >
                {isPending ? "Submitting..." : payUpfront ? "Confirm & Pay" : "Confirm Booking"}
              </Button>
            )}
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
  tone: "error" | "info" | "success"
}) {
  return (
    <div
      aria-live="polite"
      className={cn(
        "flex items-start gap-3 border px-4 py-3",
        tone === "error" && "border-red-200 bg-red-50",
        tone === "info" && "border-[#c96c83]/20 bg-white",
        tone === "success" && "border-green-200 bg-green-50",
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn(
          "mt-0.5 size-4 shrink-0",
          tone === "error" && "text-red-500",
          tone === "info" && "text-[#c96c83]",
          tone === "success" && "text-green-600",
        )}
      />
      <p
        className={cn(
          "text-sm leading-6",
          tone === "error" && "text-red-700",
          tone === "info" && "text-[#5f6268]",
          tone === "success" && "text-green-700",
        )}
      >
        {message}
      </p>
    </div>
  )
}

function getBookingFormHint({
  hasAddress,
  hasDate,
  hasService,
  isServiced,
  isTimeValid,
}: {
  hasAddress: boolean
  hasDate: boolean
  hasService: boolean
  isServiced: boolean
  isTimeValid: boolean
}) {
  const missing: string[] = []
  if (!hasService) missing.push("service")
  if (!hasDate) missing.push("date")
  if (!isTimeValid) missing.push("valid time")
  if (!hasAddress) missing.push("service address")
  if (!isServiced) missing.push("serviced address")

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
