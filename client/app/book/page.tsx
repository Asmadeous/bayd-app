"use client"

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useMutation, useQuery } from "@tanstack/react-query"
import { Check, CheckCircle2, ChevronLeft, MapPin, Phone, Send, Sparkles, User } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"

import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { AppointmentSummary, SummaryBar, type SummaryLine } from "@/components/booking/appointment-summary"
import { DateStrip } from "@/components/booking/date-strip"
import { formatTime, TimeGroups } from "@/components/booking/time-groups"
import { BubbleLoader } from "@/components/bubble-loader"
import { ClientLookup } from "@/components/booking/client-lookup"
import { useCreateStaffBooking, type StaffClient } from "@/lib/hooks/use-employee"
import { formatDateKey, todayKey, bookingZoneLabel } from "@/lib/booking-time"
import { AddressAutocomplete } from "@/components/address-autocomplete"
import api from "@/lib/api"
import { openPaymentUrl } from "@/lib/native/open-external"
import { assetUrl } from "@/lib/asset-url"
import { useCoverage } from "@/lib/hooks/use-coverage"
import { FREQUENCY_PRESETS } from "@/lib/hooks/use-subscriptions"
import { siteConfig } from "@/lib/site"
import { useAuthStore } from "@/lib/stores/auth-store"
import { BookedAppPrompt } from "@/components/marketing/app-download"
import { DEFAULT_FRANCHISE, formatMoney, useFranchiseStore } from "@/lib/stores/franchise-store"

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
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/
// Canadian postal code (space optional). Same rule the backend enforces.
const CA_POSTAL = /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z] ?\d[ABCEGHJ-NPRSTV-Z]\d$/i
// Any other country: a plausible postal code (the backend's ANY_POSTAL).
const ANY_POSTAL = /^[A-Z0-9][A-Z0-9 -]{1,9}$/i

function regionName(code: string) {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code
  } catch {
    return code
  }
}

interface LiveFranchise { slug: string; name: string; country_code: string }

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
interface AvailabilityResult { slots: string[]; mapped: boolean; date?: string }
// One service of a visit at a start time: who does it and when (company zone).
export interface VisitPlanLine {
  service_id: number
  service_name: string
  employee_id: number
  name: string | null
  title: string | null
  photo_url: string | null
  starts_at: string
  ends_at: string
  start_time: string
  end_time: string
}
interface VisitAvailabilityResult {
  date: string
  by_time: Record<string, { single_tech: boolean; lines: VisitPlanLine[] }>
  next_available_date?: string | null
  error?: string
}
interface VisitResponse {
  visit?: { id: number }
  payment?: { mode: string; url?: string; error?: string }
  // "follow_up" → guest booked without an email; we captured a callback request
  // and the team will phone them to confirm and book manually.
  status?: string
  callback_request_id?: number
  code?: string
  error?: string
}
export interface SavedAddress {
  id: number
  label: string | null
  line1: string
  line2: string | null
  city: string
  province: string
  postal_code: string
  default?: boolean
  is_default?: boolean
  is_apartment?: boolean
  buzz_code?: string | null
}

const GROUP_MAX = 5

const field =
  "h-12 w-full rounded-xl border border-black/15 bg-white px-4 text-sm font-semibold text-[#101217] outline-none transition-colors placeholder:text-[#8a8d93] focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20"
const lbl = "mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-[#6b6f76]"
const card = "rounded-2xl border border-black/10 bg-white p-5 sm:p-6"

const STEPS = ["Details", "Service", "Add-ons", "Time", "Checkout"] as const
const STAFF_STEPS = ["Client", "Service", "Add-ons", "Date", "Confirm"] as const

export default function PublicBookPage() {
  // BookingFlow calls useSearchParams(), which requires a Suspense boundary or
  // the static prerender of /book fails the production build.
  return (
    <Suspense>
      <BookingFlow />
    </Suspense>
  )
}

export function BookingFlow({
  dashboardMode = false,
  inApp = false,
  initialAddress = null,
  staffBooking,
}: {
  dashboardMode?: boolean
  // In the customer app, which has a fixed tab bar the pinned nav must clear.
  inApp?: boolean
  initialAddress?: SavedAddress | null
  // Staff app: a tech booking a client onto their own schedule. Same steps as a
  // customer, except the client is looked up or typed in, every service is the
  // tech's own, and the last step creates the booking instead of taking payment.
  staffBooking?: { employeeId: number }
}) {
  const searchParams = useSearchParams()
  const staffMode = !!staffBooking
  // In the apps the actions are a solid bar fixed to the screen bottom, running
  // under the floating tab bar so the page never shows through around it. The
  // spacer keeps the end of the step clear of the bar at whatever height the bar
  // has on this phone (it grows with the pay-later button).
  const pinnedBar = staffMode || inApp
  const router = useRouter()
  const actionsSpacerRef = useRef<HTMLDivElement>(null)
  const pinActionsBar = useCallback((bar: HTMLDivElement | null) => {
    if (!bar) return
    const observer = new ResizeObserver(() => {
      if (actionsSpacerRef.current) actionsSpacerRef.current.style.height = `${bar.offsetHeight}px`
    })
    observer.observe(bar)
    return () => observer.disconnect()
  }, [])
  const { user: signedIn } = useAuthStore()
  // The signed-in person is the tech in staff mode, never the client.
  const user = staffMode ? null : signedIn
  const { data: services = [] } = useQuery<ApiService[]>({
    queryKey: ["public-services"],
    queryFn: () => api.get<ApiService[]>("/services").then((r) => r.data),
  })

  const [step, setStep] = useState(0)
  const [clientType, setClientType] = useState<ClientType>("adult")
  const [partySize, setPartySize] = useState(2)
  const [categoryFilter, setCategoryFilter] = useState<string>("all") // "all" | category_name
  const [serviceId, setServiceId] = useState(searchParams.get("service") ?? "")
  const [pickedClient, setPickedClient] = useState<StaffClient | null>(null)
  const [date, setDate] = useState(() => searchParams.get("date") ?? todayKey())
  const [time, setTime] = useState(() => searchParams.get("time") ?? "")
  // Prefill from the account whenever the customer is SIGNED IN - not just in
  // dashboard mode. A logged-in user booking from the public /book page shouldn't
  // have to retype details we already have. Dashboard mode still layers a chosen
  // saved address (initialAddress) on top of the account defaults.
  const [name, setName] = useState(user ? [user.first_name, user.last_name].filter(Boolean).join(" ") : "")
  const [email, setEmail] = useState(user?.email ?? "")
  const [phone, setPhone] = useState(user?.phone ?? "")
  const [line1, setLine1] = useState(initialAddress?.line1 ?? user?.street_address ?? "")
  const [unit, setUnit] = useState(initialAddress?.line2 ?? "")
  const [city, setCity] = useState(initialAddress?.city ?? user?.city ?? "")
  // The franchise this booking is with: its country decides the address rules.
  const franchise = useFranchiseStore((s) => s.config) ?? DEFAULT_FRANCHISE
  const setFranchiseSlug = useFranchiseStore((s) => s.setSlug)
  const inCanada = franchise.country_code === "CA"
  const countryName = regionName(franchise.country_code)
  const { data: liveFranchises = [] } = useQuery<LiveFranchise[]>({
    queryKey: ["live-franchises"],
    queryFn: () => api.get<LiveFranchise[]>("/franchises").then((r) => r.data),
    enabled: !staffBooking,
    staleTime: 10 * 60 * 1000,
  })
  const [province, setProvince] = useState(initialAddress?.province ?? (inCanada ? "ON" : ""))
  const [postal, setPostal] = useState(initialAddress?.postal_code ?? user?.postal_code ?? "")
  const [isApartment, setIsApartment] = useState(Boolean(initialAddress?.is_apartment))
  const [buzzCode, setBuzzCode] = useState(initialAddress?.buzz_code ?? "")

  // The auth store is persisted and hydrates from localStorage AFTER first render,
  // so the useState initializers above can miss it. Once `user` becomes available,
  // backfill any field the customer hasn't already typed exactly once - so a
  // signed-in user never re-enters details we hold, without clobbering their edits.
  const prefilledRef = useRef(false)
  useEffect(() => {
    if (!user || prefilledRef.current) return
    prefilledRef.current = true
    const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ")
    setName((v) => v || fullName)
    setEmail((v) => v || user.email || "")
    setPhone((v) => v || user.phone || "")
    setLine1((v) => v || user.street_address || "")
    setCity((v) => v || user.city || "")
    setPostal((v) => v || user.postal_code || "")
  }, [user])

  const [notes, setNotes] = useState("")
  const [tip, setTip] = useState("") // optional gratuity in dollars
  const [giftCard, setGiftCard] = useState("")
  const [giftCardOpen, setGiftCardOpen] = useState(false)
  // Auto-renewal: repeat this booking on a schedule. The backend seeds a
  // Subscription from the first booking and SubscriptionSchedulerJob books the
  // next one automatically; auto-charge bills the card on file each time.
  const [recurring, setRecurring] = useState(false)
  const [recurLabel, setRecurLabel] = useState<string>("Weekly")
  const recurPreset = FREQUENCY_PRESETS.find((p) => p.label === recurLabel) ?? FREQUENCY_PRESETS[1]
  const [autoCharge, setAutoCharge] = useState(false)
  // More services in the same visit, from any category. Each becomes its own
  // booking, done back-to-back by a technician who offers it.
  const [addonIds, setAddonIds] = useState<number[]>([])
  const [bookedMsg, setBookedMsg] = useState("")
  const [view, setView] = useState<"form" | "booked" | "consultation" | "follow_up">("form")
  const [error, setError] = useState<string | null>(null)
  const [addressError, setAddressError] = useState<string | null>(null)
  const [verifyingAddress, setVerifyingAddress] = useState(false)
  // Geocoded customer coordinates (from address verification). Fed back to the
  // availability query so travel-infeasible slots are filtered out on re-pick.
  const [custLat, setCustLat] = useState<number | null>(null)
  const [custLng, setCustLng] = useState<number | null>(null)

  // Kids see only kids services; everyone else sees the regular menu.
  const menu = useMemo(
    () =>
      services.filter(
        (s) =>
          (clientType === "kids" ? s.kids_only : !s.kids_only) &&
          (!staffBooking || (s.providers ?? []).some((p) => p.id === staffBooking.employeeId)),
      ),
    [services, clientType, staffBooking],
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

  const perPerson = (s: ApiService) => Number(s.prices?.[clientType] ?? s.price)

  // Anything else on the menu can join the visit. Staff only offer their own
  // services (the menu is already filtered to them).
  const addonOptions = !selected
    ? []
    : menu.filter((s) => String(s.id) !== serviceId && !s.requires_consultation)
  // Add-ons grouped by category (the main service's own category first) so the
  // list scans like the service menu instead of one long run.
  const addonGroups = Array.from(
    addonOptions.reduce((map, s) => {
      const key = s.category_name ?? "Other"
      map.set(key, [...(map.get(key) ?? []), s])
      return map
    }, new Map<string, ApiService[]>()),
  ).sort(([a], [b]) => Number(b === selected?.category_name) - Number(a === selected?.category_name))
  // In the order the customer added them: that's the order they're done in.
  const chosenAddons = addonIds.flatMap((id) => addonOptions.filter((s) => s.id === id))
  const validAddonIds = chosenAddons.map((s) => s.id)
  const visitServices = selected ? [selected, ...chosenAddons] : []
  const visitServiceIds = visitServices.map((s) => s.id)
  const skipAddons = addonOptions.length === 0

  // Group total = per-person price × number of people.
  const totalFor = (s: ApiService) => (clientType === "group" ? perPerson(s) * partySize : perPerson(s))
  const price = selected ? totalFor(selected) : null
  const visitTotal = visitServices.reduce((sum, s) => sum + totalFor(s), 0)
  // A group visit is one long visit per service: durations scale by party size.
  const apptMinutes = visitServices.reduce((sum, s) => sum + s.duration_minutes * (clientType === "group" ? partySize : 1), 0)
  // Client-side estimate only (backend is authoritative: 25% / $50 min defaults).
  const depositEstimate = Math.min(Math.max(visitTotal * 0.25, 50), visitTotal)

  const coverage = useCoverage(postal)
  const notServiced = coverage.data ? !coverage.data.covered : false

  // Staff book onto their own schedule: their open slots for the whole visit.
  const slotCount = clientType === "group" ? partySize : 1
  const canQuerySlots = staffMode && !!serviceId && !!date
  const availability = useQuery<AvailabilityResult>({
    queryKey: ["availability", serviceId, staffBooking?.employeeId, date, slotCount, validAddonIds, custLat, custLng, postal.trim()],
    queryFn: () =>
      api
        .get<AvailabilityResult>("/availability", {
          params: {
            service_id: Number(serviceId), employee_id: staffBooking?.employeeId, date, count: slotCount,
            addon_service_ids: validAddonIds.length ? validAddonIds : undefined,
            latitude: custLat ?? undefined, longitude: custLng ?? undefined,
            postal_code: postal.trim() || undefined,
          },
        })
        .then((r) => r.data),
    enabled: canQuerySlots,
    staleTime: 60 * 1000,
  })
  const slots = availability.data?.slots ?? []
  const slotMode = staffMode && availability.data?.mapped === true

  // Customers: times when EVERY chosen service has a technician, and who does
  // what at each time (the planner picks the techs).
  const canQueryVisit = !staffMode && visitServiceIds.length > 0 && !!date
  const visitAvailability = useQuery<VisitAvailabilityResult>({
    queryKey: ["availability-visit", visitServiceIds, date, slotCount, custLat, custLng, postal.trim()],
    queryFn: () =>
      api
        .get<VisitAvailabilityResult>("/availability/visit", {
          params: {
            service_ids: visitServiceIds, date, count: slotCount,
            latitude: custLat ?? undefined, longitude: custLng ?? undefined,
            postal_code: postal.trim() || undefined,
          },
        })
        .then((r) => r.data),
    enabled: canQueryVisit,
    staleTime: 60 * 1000,
  })
  const visitTimes = Object.keys(visitAvailability.data?.by_time ?? {})
  const plan = time ? visitAvailability.data?.by_time?.[time]?.lines ?? [] : []
  const nextAvailableDate = visitAvailability.data?.next_available_date ?? null

  const createBooking = useMutation({
    mutationFn: (pay: { timing: "pay_upfront" | "pay_after"; groupCharge?: "deposit" | "full" }) =>
      api
        .post<VisitResponse>("/visits", {
          customer: {
            // The form collects one "Full name" field; split it so the backend
            // gets first_name + last_name (first word = first name, rest = last).
            first_name: name.trim().split(/\s+/)[0] || undefined,
            last_name: name.trim().split(/\s+/).slice(1).join(" ") || undefined,
            email: email.trim() || undefined,
            phone: phone.trim() || undefined,
          },
          address: {
            line1: line1.trim(),
            line2: unit.trim() || undefined,
            city: city.trim(),
            province,
            postal_code: postal.trim(),
            is_apartment: isApartment,
            buzz_code: isApartment ? buzzCode.trim() || undefined : undefined,
          },
          visit: {
            service_ids: visitServiceIds,
            client_type: clientType,
            party_size: clientType === "group" ? partySize : 1,
            starts_at: `${date}T${time}:00`,
            payment_timing: pay.timing,
            group_charge: pay.groupCharge,
            tip: tip ? Number(tip) : undefined,
            gift_card_code: giftCard.trim() || undefined,
            notes: notes.trim() || undefined,
            // Auto-renewal (recurring booking). Only sent when the customer opts in.
            recurrence_active: recurring || undefined,
            recurrence_interval_unit: recurring ? recurPreset.unit : undefined,
            recurrence_interval_count: recurring ? recurPreset.count : undefined,
            auto_charge: recurring && autoCharge ? true : undefined,
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
    setAddonIds((ids) => ids.filter((x) => x !== id))
    setTime("")
    setStep(2)
  }

  // Add-ons is skipped when there's nothing else to add.
  function goNext() {
    setStep((s) => (s === 1 && skipAddons ? 3 : s + 1))
  }
  function goBack() {
    setStep((s) => (s === 3 && skipAddons ? 1 : s - 1))
  }

  function pickClient(c: StaffClient) {
    setPickedClient(c)
    setName([c.first_name, c.last_name].filter(Boolean).join(" "))
    setEmail(c.email ?? "")
    setPhone(c.phone ?? "")
    if (c.address) {
      setLine1(c.address.line1)
      setUnit(c.address.line2 ?? "")
      setCity(c.address.city)
      setProvince(c.address.province)
      setPostal(c.address.postal_code)
      setIsApartment(c.address.is_apartment)
      setBuzzCode(c.address.buzz_code ?? "")
    }
  }

  function clearClient() {
    setPickedClient(null)
    for (const set of [setName, setEmail, setPhone, setLine1, setUnit, setCity, setPostal, setBuzzCode]) set("")
    setIsApartment(false)
  }

  const isTimeValid = TIME_PATTERN.test(time)
  // Each service with the tech doing it once a time is picked.
  const summaryLines: SummaryLine[] = visitServices.map((s) => {
    const tech = plan.find((l) => l.service_id === s.id)?.name
    const detail = [tech ? `with ${tech}` : null, `${s.duration_minutes} min`, clientType === "group" ? `${partySize} people` : null]
      .filter(Boolean)
      .join(" · ")
    return { name: s.name, detail, price: s.requires_consultation ? null : totalFor(s) }
  })
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  // At least one of email/phone is required, not both — a customer without an
  // inbox can still book by phone (staff/notifications reach them by call/SMS).
  // If an email IS given it must be well-formed; a bare phone number is fine.
  const contactValid = email.trim() ? emailValid : !!phone.trim()
  const postalFormatOk = (inCanada ? CA_POSTAL : ANY_POSTAL).test(postal.trim())
  const postalHint = inCanada ? "Enter a valid Canadian postal code (e.g. M5J 2X5)." : "Enter a valid postal code."
  // A typed phone needs a full 10-digit number (country code optional).
  const phoneDigits = phone.replace(/\D/g, "")
  const phoneOk = !phone.trim() || phoneDigits.length === 10 || (phoneDigits.length === 11 && phoneDigits.startsWith("1"))
  // Staff book for someone else, so the client's name is required.
  const nameOk = !staffMode || name.trim().length >= 2
  const stepValid = [
    // Details: a contact method + all address fields + a postal code in the
    // franchise country's format. The realness check runs on Continue.
    nameOk && contactValid && phoneOk && !!line1.trim() && !!city.trim() && postalFormatOk,
    !!serviceId, // Service
    true, // Add-ons (optional)
    // Time. Customers must pick a real combined time (every service staffed) so
    // a stale one can't slip through. Staff may book outside their open slots.
    !!date && isTimeValid && (staffMode ? true : visitTimes.includes(time)),
    true, // Checkout (pay-after is always valid)
  ]

  // Verify the typed address is real and in the franchise's country (Google
  // geocode via our backend) before advancing off the Details step, then make
  // sure the franchise that serves it is the one this booking goes to.
  async function verifyAddressThenAdvance() {
    setAddressError(null)
    if (!postalFormatOk) {
      setAddressError(postalHint)
      return
    }
    setVerifyingAddress(true)
    try {
      const { data } = await api.post<{ valid: boolean; in_country?: boolean; in_canada: boolean; postal_format_ok: boolean; error?: string; latitude?: number | null; longitude?: number | null }>(
        "/geo/verify_address",
        { line1: line1.trim(), city: city.trim(), province, postal_code: postal.trim() },
      )
      if (data.valid) {
        setCustLat(data.latitude ?? null)
        setCustLng(data.longitude ?? null)
        if (!staffMode) await switchToServingFranchise(data.latitude ?? null, data.longitude ?? null)
        setStep((s) => s + 1)
      } else if (!data.postal_format_ok) {
        setAddressError(postalHint)
      } else if (!(data.in_country ?? data.in_canada)) {
        setAddressError(`We couldn't find that address in ${countryName}. Check the street, city, and postal code.`)
      } else {
        setAddressError("Please double-check your address details.")
      }
    } catch {
      setAddressError("Couldn't verify your address just now. Please try again.")
    } finally {
      setVerifyingAddress(false)
    }
  }

  // A country can have more than one franchise (regions): book with the one
  // whose technicians cover this address.
  async function switchToServingFranchise(lat: number | null, lng: number | null) {
    try {
      const { data } = await api.get<{ slug: string }>("/franchise/resolve", {
        params: { country_code: franchise.country_code, postal_code: postal.trim(), latitude: lat ?? undefined, longitude: lng ?? undefined },
      })
      if (data.slug && data.slug !== franchise.slug) setFranchiseSlug(data.slug)
    } catch {
      // Keep the current franchise; booking still checks coverage on submit.
    }
  }

  // Switching country starts the booking over in that franchise (its own
  // services, prices, technicians and address rules).
  function chooseCountry(slug: string) {
    setFranchiseSlug(slug)
    setServiceId("")
    setAddonIds([])
    setTime("")
    setPostal("")
    setProvince("")
    setCustLat(null)
    setCustLng(null)
    setAddressError(null)
  }

  const createStaffBooking = useCreateStaffBooking()
  async function submitStaff() {
    setError(null)
    const [first, ...rest] = name.trim().split(/\s+/)
    try {
      await createStaffBooking.mutateAsync({
        service_ids: visitServiceIds,
        starts_at: `${date}T${time}:00`,
        customer: {
          email: email.trim() || undefined,
          first_name: first || undefined,
          last_name: rest.join(" ") || undefined,
          phone: phone.trim() || undefined,
        },
        client_type: clientType,
        party_size: clientType === "group" ? partySize : 1,
        address: {
          line1: line1.trim(),
          line2: unit.trim() || undefined,
          city: city.trim(),
          province,
          postal_code: postal.trim(),
          is_apartment: isApartment,
          buzz_code: isApartment ? buzzCode.trim() || undefined : undefined,
        },
        notes: notes.trim() || undefined,
      })
      setBookedMsg("It's on your schedule as a confirmed booking.")
      setView("booked")
    } catch (err: unknown) {
      const d = (err as { response?: { data?: { error?: string; errors?: string[] } } })?.response?.data
      setError(d?.error ?? d?.errors?.join(", ") ?? "Could not create the booking. Please try again.")
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
      // Guest booked without an email → captured as an admin follow-up (can't be
      // auto-booked). The team will phone them to confirm + book.
      if (data.status === "follow_up") {
        setView("follow_up")
        return
      }
      // Pay-now / group deposit-or-full with a balance → Square hosted checkout.
      // On the web this navigates the tab; in the Capacitor app it opens the
      // system browser so the app isn't stranded (openPaymentUrl handles both).
      // In the app, when that browser closes we land the user on their bookings
      // screen (the backend webhook has already confirmed the booking) instead of
      // stranding them on the form. onFinished is native-only, so the website's
      // same-tab redirect is unaffected.
      if (data.payment?.mode === "link" && data.payment.url) {
        void openPaymentUrl(data.payment.url, dashboardMode ? () => window.location.assign("/app/bookings") : undefined)
        return
      }
      if (data.visit) {
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
        setError("We couldn't confirm technicians for that time. Please pick another time.")
      }
    } catch (err: unknown) {
      const res = (err as { response?: { status?: number; data?: VisitResponse } })?.response
      if (res?.data?.code === "no_coverage") {
        requestCallback.mutate()
        return
      }
      // The time was taken or can no longer be staffed for every service: back
      // to Time, which re-queries and shows only times that still work.
      if (res?.data?.code === "no_availability" || res?.data?.code === "slot_taken") {
        setTime("")
        setStep(3)
        setError(res.data.error ?? "That time just became unavailable. Please pick another open time.")
        return
      }
      setError(res?.data?.error ?? "Something went wrong. Please try again.")
    }
  }

  const summaryWhen =
    step >= 3 && stepValid[3]
      ? {
          date: formatDateKey(date, { weekday: "long", month: "short", day: "numeric" }),
          time: slotRange(time, apptMinutes),
          short: `${formatDateKey(date, { weekday: "short", month: "short", day: "numeric" })} · ${slotRange(time, apptMinutes)}`,
        }
      : null
  const summary = (
    <AppointmentSummary lines={summaryLines} when={summaryWhen} onEditService={step > 1 ? () => setStep(1) : undefined} />
  )

  if (view === "booked") {
    return (
      <Shell dashboardMode={dashboardMode} onBack={pinnedBar ? () => router.back() : undefined}>
        <div className={cn(card, "mx-auto max-w-2xl text-center")}>
          <CheckCircle2 className="mx-auto mb-3 size-9 text-emerald-600" />
          <h1 className="text-xl font-black tracking-tight">{staffMode ? "Booking created" : "You\u2019re booked!"}</h1>
          <p className="mx-auto mt-2 max-w-md text-sm font-medium text-[#5f6268]">
            {bookedMsg || "Your appointment is confirmed."}{" "}
            {!staffMode && (email.trim() || phone.trim()) ? (
              <>
                We&apos;ll reach you at{" "}
                <span className="font-bold text-[#101217]">{email.trim() || phone.trim()}</span>.
              </>
            ) : null}
          </p>
          <Link href={staffMode ? "/staff/schedule" : dashboardMode ? "/dashboard/customer" : "/"} className="mt-5 inline-block rounded-xl bg-[#101217] px-5 py-2.5 text-sm font-bold text-white">
            {staffMode ? "Back to schedule" : dashboardMode ? "Back to dashboard" : "Back to home"}
          </Link>
          {!staffMode ? <BookedAppPrompt /> : null}
        </div>
      </Shell>
    )
  }

  if (view === "follow_up") {
    return (
      <Shell dashboardMode={dashboardMode} onBack={pinnedBar ? () => router.back() : undefined}>
        <div className={cn(card, "mx-auto max-w-2xl text-center")}>
          <Phone className="mx-auto mb-3 size-9 text-[#c96c83]" />
          <h1 className="text-xl font-black tracking-tight">Request received — we&apos;ll call to confirm</h1>
          <p className="mx-auto mt-2 max-w-md text-sm font-medium text-[#5f6268]">
            Thanks! Since you booked without an email, our team will call you
            {phone.trim() ? <> at <span className="font-bold text-[#101217]">{phone.trim()}</span></> : null}{" "}
            to confirm your appointment and finish booking. Add an email next time to confirm instantly.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <a
              href={`tel:${siteConfig.phoneHref}`}
              className="inline-flex h-10 items-center gap-1.5 px-4 text-sm font-bold text-white"
              style={{ background: "#c96c83" }}
            >
              <Phone className="size-4" /> Call us: {siteConfig.phone}
            </a>
          </div>
          <Link href={dashboardMode ? "/dashboard/customer" : "/"} className="mt-5 inline-block rounded-xl bg-[#101217] px-5 py-2.5 text-sm font-bold text-white">
            Done
          </Link>
        </div>
      </Shell>
    )
  }

  if (view === "consultation") {
    return (
      <Shell dashboardMode={dashboardMode} onBack={pinnedBar ? () => router.back() : undefined}>
        <div className={cn(card, "mx-auto max-w-2xl text-center")}>
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
          <Link href={dashboardMode ? "/dashboard/customer" : "/"} className="mt-5 inline-block rounded-xl bg-[#101217] px-5 py-2.5 text-sm font-bold text-white">
            {dashboardMode ? "Back to dashboard" : "Back to home"}
          </Link>
        </div>
      </Shell>
    )
  }

  return (
    <>
      {dashboardMode ? null : <SiteHeader />}
      <Shell dashboardMode={dashboardMode} onBack={pinnedBar ? (step > 0 ? goBack : () => router.back()) : undefined}>
        <div className="mb-5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#c96c83]/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#c96c83]">
            <Sparkles className="size-3.5" /> Appointment
          </span>
          <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">{staffMode ? "New booking" : "Book an appointment"}</h1>
          <p className="mt-1 text-sm font-medium text-[#5f6268]">
            {staffMode
              ? "Find the client or add their details, then pick the service and time."
              : dashboardMode
              ? "Your details are prefilled from your account. Review them, choose a service, and confirm your appointment."
              : "No account needed — just your email or phone number. You can book without paying now and settle up after your service."}
          </p>
        </div>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-8">
      <div className="min-w-0">
      {/* Stepper */}
      <div className="mb-6 flex items-center gap-2">
        {(staffMode ? [...STAFF_STEPS] : [...STEPS]).map((label, i) => (
          <div key={label} className="flex flex-1 items-center gap-2">
            <div
              className={cn(
                "grid size-8 shrink-0 place-items-center rounded-full border text-xs font-black",
                i < step
                  ? "border-[#c96c83] bg-[#c96c83] text-white"
                  : i === step
                    ? "border-[#c96c83] bg-white text-[#c96c83]"
                    : "border-black/15 bg-white text-[#a7abb2]",
              )}
            >
              {i < step ? <Check className="size-3.5" /> : i + 1}
            </div>
            <span className={cn("hidden whitespace-nowrap text-xs font-bold sm:block", i === step ? "text-[#101217]" : "text-[#a7abb2]")}>
              {label}
            </span>
            {i < STEPS.length - 1 ? <div className="h-px flex-1 bg-black/10" /> : null}
          </div>
        ))}
      </div>

      {/* Step 2 — Service (with age selector) */}
      {step === 1 ? (
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
                  "rounded-xl border px-3 py-2 text-sm font-bold transition-colors",
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

          {/* Let customers know they can combine services before they pick. */}
          <p className="mb-3 flex items-center gap-1.5 border-l-2 border-[#c96c83] bg-[#c96c83]/[0.06] px-3 py-2 text-xs font-medium text-[#5f6268]">
            <span aria-hidden>💡</span>
            {staffMode
              ? "Pick the first service. You can add more of your services to the same visit next."
              : "Pick your first service. You can add more from any category next, like lashes with a pedicure."}
          </p>

          <div className="grid gap-4">
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
                          className="flex items-start gap-3 rounded-xl border border-black/15 bg-white p-3 text-left transition-colors hover:border-[#c96c83]"
                        >
                          {/* Thumbnail — real photo (all services have one); neutral fill if missing. */}
                          {s.image_url ? (
                            <span className="size-16 shrink-0 overflow-hidden rounded-lg bg-[#f0ece4]">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={assetUrl(s.image_url)} alt={s.name} className="size-full object-cover" />
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
                            {s.requires_consultation ? "Quote" : `${formatMoney(p)}`}
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

      {/* Add-ons: Square's "Add more to your appointment?" */}
      {step === 2 ? (
        <div className={card}>
          <h2 className="text-lg font-black tracking-tight">Add more to your appointment?</h2>
          <p className="mt-1 text-sm font-medium text-[#5f6268]">
            {staffMode
              ? "Done back-to-back in the same visit. Optional."
              : "Done back-to-back in the same visit, each by a technician who offers it. Optional."}
          </p>
          <div className="mt-4 grid gap-2">
            {selected ? (
              <div className="flex items-center gap-3 rounded-xl border border-[#c96c83] bg-[#c96c83]/[0.06] p-3">
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold">{selected.name}</span>
                  <span className="block text-xs font-medium text-[#8a8d93]">
                    {price != null ? `${formatMoney(price)}` : "Quote"} · {selected.duration_minutes} min
                  </span>
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-[#c96c83]">
                  <Check className="size-3.5" aria-hidden /> Added
                </span>
              </div>
            ) : null}
            {addonOptions.length === 0 ? (
              <p className="py-2 text-sm font-medium text-[#8a8d93]">There&apos;s nothing else to add.</p>
            ) : null}
            {addonGroups.map(([category, list]) => (
              <div key={category} className="pt-2">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#a7abb2]">{category}</p>
                <div className="grid gap-2">
            {list.map((a) => {
              const added = addonIds.includes(a.id)
              return (
                <button
                  key={a.id}
                  type="button"
                  aria-pressed={added}
                  onClick={() => {
                    setTime("")
                    setAddonIds((ids) => (added ? ids.filter((x) => x !== a.id) : [...ids, a.id]))
                  }}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-3 text-left transition-colors",
                    added ? "border-[#c96c83] bg-[#c96c83]/[0.06]" : "border-black/10 bg-white hover:border-black/25",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold">{a.name}</span>
                    <span className="block text-xs font-medium text-[#8a8d93]">
                      +{formatMoney(totalFor(a))} · +{a.duration_minutes} min
                    </span>
                  </span>
                  {added ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-[#c96c83]">
                      <Check className="size-3.5" aria-hidden /> Added
                    </span>
                  ) : (
                    <span className="rounded-full bg-black/[0.05] px-3 py-1 text-xs font-bold">Add</span>
                  )}
                </button>
              )
            })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Time: Square-style week strip + Morning / Afternoon / Evening. Customers
          see times when every chosen service is staffed, and who does what. */}
      {step === 3 ? (
        <div className={card}>
          <DateStrip value={date} onChange={(d) => { setDate(d); setTime("") }} />
          <p className="mt-1 text-center text-xs font-medium text-[#8a8d93]">Times are shown in {bookingZoneLabel()} time.</p>

          <h2 className="mt-5 border-t border-black/10 pt-5 text-base font-black tracking-tight">
            {date === todayKey() ? "Today, " : ""}
            {formatDateKey(date, { weekday: "long", month: "short", day: "numeric", year: "numeric" })}
          </h2>

          <div className="mt-4">
            {staffMode ? (
              slotMode ? (
                availability.isFetching ? (
                  <BubbleLoader className="py-6" label="Finding open times" />
                ) : slots.length === 0 ? (
                  <p className="text-sm font-medium text-[#8a8d93]">No open times on this date.</p>
                ) : (
                  <TimeGroups times={slots} selected={time} onPick={setTime} />
                )
              ) : null
            ) : visitAvailability.isFetching ? (
              <BubbleLoader className="py-6" label="Finding open times" />
            ) : visitTimes.length === 0 ? (
              <NextDayPrompt nextDate={nextAvailableDate} onJump={(d) => { setDate(d); setTime("") }} />
            ) : (
              <>
                <TimeGroups times={visitTimes} selected={time} onPick={setTime} />
                {plan.length ? <VisitPlan lines={plan} /> : null}
              </>
            )}
            {staffMode ? (
              <label className={cn("block", slotMode && "mt-5 border-t border-black/10 pt-4")}>
                <span className={lbl}>{slotMode ? "Other time (outside your open slots)" : "Time"}</span>
                <input type="time" className={field} value={time} onChange={(e) => setTime(e.target.value)} />
              </label>
            ) : null}
          </div>
          {error ? <p className="mt-3 text-sm font-bold text-red-600">{error}</p> : null}
        </div>
      ) : null}

      {/* Step 1 — Details */}
      {step === 0 ? (
        <div className={card}>
          {staffMode ? (
            <div className="mb-5">
              <label className={lbl}><User className="mr-1 inline size-3.5" /> Find the client</label>
              <ClientLookup picked={pickedClient} onPick={pickClient} onClear={clearClient} />
            </div>
          ) : null}
          <label className={lbl}><User className="mr-1 inline size-3.5" /> {staffMode ? "Client details" : "Your details"}</label>
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <input
                className={cn(field, staffMode && name.trim() && !nameOk ? "border-red-400" : "")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={staffMode ? "Full name *" : "Full name"}
                autoComplete={staffMode ? "off" : "name"}
              />
              <input
                className={cn(field, !phoneOk ? "border-red-400" : "")}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={email.trim() ? "Phone" : "Phone *"}
                inputMode="tel"
                autoComplete={staffMode ? "off" : "tel"}
              />
            </div>
            {!phoneOk ? (
              <p className="-mt-2 text-xs font-semibold text-red-600">Enter a 10-digit phone number, e.g. 647 555 0199.</p>
            ) : null}
            <input
              className={field}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={phone.trim() ? "Email" : "Email *"}
              type="email"
              autoComplete={staffMode ? "off" : "email"}
            />
            {email.trim() && !emailValid ? (
              <p className="-mt-2 text-xs font-semibold text-red-600">That email doesn&apos;t look right.</p>
            ) : (
              <p className="-mt-2 text-xs font-medium text-[#8a8d93]">
                Add an email or a phone number so we can reach {staffMode ? "them" : "you"}.
              </p>
            )}
            {!staffMode && phone.trim() && !email.trim() ? (
              <p className="-mt-1 text-xs font-semibold text-[#c96c83]">
                Add an email to confirm your booking instantly — without one, we&apos;ll call you to confirm.
              </p>
            ) : null}

            <label className={cn(lbl, "mt-1")}><MapPin className="mr-1 inline size-3.5" /> Service address</label>
            {!staffMode && liveFranchises.length > 1 ? (
              <select
                className={field}
                aria-label="Country"
                value={franchise.slug}
                onChange={(e) => chooseCountry(e.target.value)}
              >
                {liveFranchises.map((f) => (
                  <option key={f.slug} value={f.slug}>{regionName(f.country_code)} · {f.name}</option>
                ))}
              </select>
            ) : null}
            <AddressAutocomplete
              className={field}
              value={line1}
              onChange={setLine1}
              onResolved={(addr) => {
                if (addr.city) setCity(addr.city)
                if (addr.province) setProvince(addr.province)
                if (addr.postal_code) setPostal(addr.postal_code)
                if (addr.latitude != null) setCustLat(addr.latitude)
                if (addr.longitude != null) setCustLng(addr.longitude)
              }}
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <input className={field} value={city} onChange={(e) => setCity(e.target.value)} placeholder="City *" />
              {inCanada ? (
                <select className={field} value={province} onChange={(e) => setProvince(e.target.value)}>
                  {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              ) : (
                <input className={field} value={province} onChange={(e) => setProvince(e.target.value)} placeholder="Region (optional)" />
              )}
              <input
                className={cn(field, postal.trim() && !postalFormatOk ? "border-red-400 focus:border-red-500 focus:ring-red-500/20" : "")}
                value={postal}
                onChange={(e) => { setPostal(e.target.value); setAddressError(null) }}
                placeholder="Postal code *"
                autoCapitalize="characters"
              />
            </div>
            {postal.trim() && !postalFormatOk ? (
              <p className="-mt-2 text-xs font-semibold text-red-600">{postalHint}</p>
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
            <textarea className={cn(field, "h-20 py-2")} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={staffMode ? "Notes (optional)" : "Notes for your technician (optional)"} />
          </div>

          {!staffMode && postal.trim().length >= 3 && coverage.data ? (
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
      {step === 4 && staffMode ? (
        <div className={card}>
          <h2 className="text-lg font-black tracking-tight">Confirm the booking</h2>
          <p className="mt-1 text-sm font-medium text-[#5f6268]">
            For <span className="font-bold text-[#101217]">{name.trim()}</span> at {line1.trim()}, {city.trim()}. It goes
            straight onto your schedule as confirmed; take payment on the day from the booking card.
          </p>
          {error ? <p className="mt-3 text-sm font-bold text-red-600">{error}</p> : null}
        </div>
      ) : null}

      {step === 4 && !staffMode ? (
        <div className={card}>
          {clientType === "group" ? (
            <p className="mb-5 text-sm font-semibold text-[#c96c83]">
              Pay a deposit ({formatMoney(depositEstimate)}) or the full {formatMoney(visitTotal)} to confirm.
            </p>
          ) : null}

          <label className={lbl}>Add a tip (optional)</label>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {[0, 15, 18, 20].map((pct) => {
              const amt = pct === 0 ? 0 : Math.round(visitTotal * pct) / 100
              const active = pct === 0 ? !tip : tip === amt.toFixed(2)
              return (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setTip(pct === 0 ? "" : amt.toFixed(2))}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-sm font-bold transition-colors",
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

          {giftCardOpen || giftCard ? (
            <>
              <label className={lbl}>Gift card</label>
              <input
                className={field}
                value={giftCard}
                onChange={(e) => setGiftCard(e.target.value)}
                placeholder="Gift card code"
                autoFocus={giftCardOpen && !giftCard}
              />
            </>
          ) : (
            <button type="button" onClick={() => setGiftCardOpen(true)} className="text-sm font-bold text-[#c96c83]">
              Have a gift card?
            </button>
          )}

          {/* Auto-renewal — repeat this booking on a schedule (single bookings only). */}
          {clientType !== "group" ? (
            <div className="mt-5 rounded-2xl border border-black/15 bg-white p-4">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={recurring}
                  onChange={(e) => setRecurring(e.target.checked)}
                  className="mt-0.5 size-4 accent-[#c96c83]"
                />
                <span className="text-sm font-bold text-[#101217]">Repeat this booking automatically</span>
              </label>

              {recurring ? (
                <div className="mt-4 space-y-3">
                  <div>
                    <label className={lbl} htmlFor="repeat-frequency">How often</label>
                    <select
                      id="repeat-frequency"
                      className={field}
                      value={recurLabel}
                      onChange={(e) => setRecurLabel(e.target.value)}
                    >
                      {FREQUENCY_PRESETS.map((p) => (
                        <option key={p.label} value={p.label}>{p.label}</option>
                      ))}
                    </select>
                  </div>

                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={autoCharge}
                      onChange={(e) => setAutoCharge(e.target.checked)}
                      className="mt-0.5 size-4 accent-[#c96c83]"
                    />
                    <span>
                      <span className="block text-sm font-bold text-[#101217]">Auto-charge my card on file</span>
                      <span className="mt-0.5 block text-xs font-medium text-[#8a8d93]">
                        Each repeat is charged automatically. Leave off to pay after each visit. You can pause or cancel anytime from your dashboard.
                      </span>
                    </span>
                  </label>
                </div>
              ) : null}
            </div>
          ) : null}

          {error ? <p className="mt-3 text-sm font-bold text-red-600">{error}</p> : null}
        </div>
      ) : null}

      {/* Nav. On phones it pins to the bottom with the summary bar above it (in
          the apps, a fixed bar); wide screens show the summary beside. */}
      {pinnedBar ? <div ref={actionsSpacerRef} aria-hidden className="mt-5 lg:hidden" /> : null}
      <div
        ref={pinnedBar ? pinActionsBar : undefined}
        className={cn(
          "z-30 border-t border-black/10 pt-3 lg:static lg:border-0 lg:bg-transparent lg:p-0",
          pinnedBar
            ? "fixed inset-x-0 bottom-0 bg-[#f4f1eb] px-4 pb-[calc(5.75rem+env(safe-area-inset-bottom))] lg:mt-5"
            : "sticky bottom-0 -mx-4 mt-5 bg-[#f4f1eb]/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur sm:-mx-6 sm:px-6 lg:mx-0 lg:backdrop-blur-none",
        )}
      >
      <div className="mx-auto w-full max-w-2xl lg:max-w-none">
      {/* The apps show no summary; the website on phones keeps the bar. */}
      {selected && !pinnedBar ? (
        <SummaryBar
          className="mb-3 lg:hidden"
          lines={summaryLines}
          when={summaryWhen}
          onEditService={step > 1 ? () => setStep(1) : undefined}
        />
      ) : null}
      <div className="flex items-start gap-3">
        {step > 0 && !pinnedBar ? (
          <button
            type="button"
            onClick={goBack}
            className="inline-flex h-12 items-center gap-1 rounded-xl border border-black/15 bg-white px-4 text-sm font-bold text-[#101217]"
          >
            <ChevronLeft className="size-4" /> Back
          </button>
        ) : null}
        {step === 0 && notServiced && !staffMode ? (
          // Out of area — offer a consultation call instead of proceeding to booking.
          <button
            type="button"
            disabled={!stepValid[step] || requestCallback.isPending}
            onClick={() => requestCallback.mutate()}
            className="h-12 flex-1 rounded-xl bg-[#101217] text-sm font-bold uppercase tracking-wide text-white disabled:opacity-40"
          >
            {requestCallback.isPending ? "Submitting…" : "Request a consultation call"}
          </button>
        ) : step < STEPS.length - 1 ? (
          <button
            type="button"
            disabled={!stepValid[step] || (step === 0 && verifyingAddress)}
            onClick={() => (step === 0 ? verifyAddressThenAdvance() : goNext())}
            className="h-12 flex-1 rounded-xl bg-[#101217] text-sm font-bold uppercase tracking-wide text-white disabled:opacity-40"
          >
            {step === 0 && verifyingAddress ? "Verifying address…" : "Continue"}
          </button>
        ) : staffMode ? (
          <button
            type="button"
            disabled={createStaffBooking.isPending}
            onClick={submitStaff}
            className="h-12 flex-1 rounded-xl bg-[#c96c83] text-sm font-bold uppercase tracking-wide text-white disabled:opacity-40"
          >
            {createStaffBooking.isPending ? "Creating…" : "Create booking"}
          </button>
        ) : clientType === "group" ? (
          // Group: mandatory payment — deposit or full, both go to checkout.
          <div className="flex flex-1 flex-col gap-2 sm:flex-row">
            <button
              type="button"
              disabled={createBooking.isPending}
              onClick={() => submit("deposit")}
              className="h-12 flex-1 rounded-xl border border-[#101217] bg-white text-sm font-bold uppercase tracking-wide text-[#101217] disabled:opacity-40"
            >
              {createBooking.isPending ? "…" : `Pay deposit ${formatMoney(depositEstimate)}`}
            </button>
            <button
              type="button"
              disabled={createBooking.isPending}
              onClick={() => submit("full")}
              className="h-12 flex-1 rounded-xl bg-[#101217] text-sm font-bold uppercase tracking-wide text-white disabled:opacity-40"
            >
              {createBooking.isPending ? "…" : `Pay full ${formatMoney(visitTotal)}`}
            </button>
          </div>
        ) : (
          // Regular: pay now (→ checkout) is the primary action; booking and
          // paying after the visit is the secondary path, below the row.
          <button
            type="button"
            disabled={createBooking.isPending}
            onClick={() => submit("pay_now")}
            className="h-12 flex-1 rounded-xl bg-[#c96c83] text-sm font-bold uppercase tracking-wide text-white disabled:opacity-40"
          >
            {createBooking.isPending ? "…" : `Pay now ${formatMoney((visitTotal + (Number(tip) || 0)))}`}
          </button>
        )}
      </div>
      {step === STEPS.length - 1 && !staffMode && clientType !== "group" ? (
        <button
          type="button"
          disabled={createBooking.isPending}
          onClick={() => submit("proceed")}
          className="mt-2 h-12 w-full rounded-xl border border-[#101217]/20 bg-white text-sm font-bold text-[#101217] disabled:opacity-40"
        >
          {createBooking.isPending ? "…" : "Book now, pay after the visit"}
        </button>
      ) : null}
      </div>
      </div>

      </div>
        <div className="hidden lg:sticky lg:top-24 lg:block">{summary}</div>
      </div>

        {/* Centred under the form, not the whole page: on large screens the
            summary column (20rem + 2rem gap) sits to the right. */}
        {dashboardMode ? null : <p className="mt-4 text-center text-xs font-medium text-[#8a8d93] lg:pr-[22rem]">
          Already have an account? <Link href="/signin" className="font-bold text-[#c96c83]">Sign in</Link>
        </p>}
      </Shell>
      {dashboardMode ? null : <SiteFooter />}
    </>
  )
}

// Shown when a day has no openings. If the engine found the next date with an
// opening, offer a one-tap jump to it; otherwise just prompt another day.
function NextDayPrompt({ nextDate, onJump }: { nextDate: string | null; onJump: (d: string) => void }) {
  if (!nextDate) {
    return <p className="text-sm font-medium text-[#8a8d93]">No open times on this date. Try another day.</p>
  }
  const label = new Date(`${nextDate}T00:00:00`).toLocaleDateString("en-CA", {
    weekday: "long", month: "long", day: "numeric",
  })
  return (
    <div className="border border-[#c96c83]/30 bg-[#c96c83]/5 p-3">
      <p className="text-sm font-medium text-[#5f6268]">
        Fully booked on this date. The next available day is{" "}
        <span className="font-bold text-[#101217]">{label}</span>.
      </p>
      <button
        type="button"
        onClick={() => onJump(nextDate)}
        className="mt-2 inline-flex h-9 items-center rounded-lg bg-[#101217] px-4 text-sm font-bold text-white"
      >
        Jump to {label}
      </button>
    </div>
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

// Who does what at the picked time, so the customer sees every tech before booking.
function VisitPlan({ lines }: { lines: VisitPlanLine[] }) {
  return (
    <div className="mt-4 rounded-xl border border-black/10 bg-[#f7f4ef] p-3">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#6b6f76]">
        {new Set(lines.map((l) => l.employee_id)).size > 1 ? "Your technicians" : "Your technician"}
      </p>
      <ul className="grid gap-2">
        {lines.map((l) => (
          <li key={`${l.service_id}-${l.start_time}`} className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-white text-[#c96c83]">
              {l.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={assetUrl(l.photo_url)} alt={l.name ?? "Technician"} className="size-full object-cover" />
              ) : (
                <User className="size-4" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-[#101217]">{l.service_name}</span>
              <span className="block text-xs font-medium text-[#5f6268]">
                {formatTime(l.start_time)} – {formatTime(l.end_time)} · with {l.name ?? "a technician"}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// `onBack` (apps only) is the flow's one back button, at the top of every screen.
function Shell({
  children,
  dashboardMode = false,
  onBack,
}: {
  children: React.ReactNode
  dashboardMode?: boolean
  onBack?: () => void
}) {
  return (
    <main className={dashboardMode ? "text-[#101217]" : "min-h-screen bg-[#f4f1eb] text-[#101217]"}>
      <div className={dashboardMode ? "mx-auto w-full max-w-2xl lg:max-w-5xl" : "mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-14 lg:max-w-5xl"}>
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="mb-2 grid size-10 place-items-center rounded-full bg-white shadow-sm"
          >
            <ChevronLeft className="size-5" aria-hidden />
          </button>
        ) : null}
        {children}
      </div>
    </main>
  )
}

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ")
}

// A slot label shows the whole appointment window, not just the start: a 30-min
// service at 09:00 reads "9:00 - 9:30", a 2-hour one reads "9:00 - 11:00". Start
// is the backend's 24h "HH:MM"; end = start + the full visit duration.
function slotRange(start: string, minutes: number) {
  const [h, m] = start.split(":").map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return start
  const to12 = (hh: number, mm: number) => {
    const period = hh >= 12 ? "PM" : "AM"
    const hour12 = hh % 12 === 0 ? 12 : hh % 12
    return `${hour12}:${String(mm).padStart(2, "0")} ${period}`
  }
  const total = h * 60 + m + Math.max(minutes, 0)
  const endH = Math.floor(total / 60) % 24
  const endM = total % 60
  return `${to12(h, m)} – ${to12(endH, endM)}`
}
