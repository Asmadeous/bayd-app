"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { CheckCircle2, ChevronLeft } from "lucide-react"

import { useToast } from "@/components/bayd-toast-provider"
import { DashboardPage } from "@/components/dashboard/dashboard-page"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardPanel } from "@/components/dashboard/dashboard-panel"
import { TutorialButton } from "@/components/dashboard/tutorial-button"
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
import { useAdminEmployees } from "@/lib/hooks/use-admin"
import { useCreateStaffBooking, type StaffBookingInput } from "@/lib/hooks/use-employee"
import { employeeNewBookingSteps } from "@/lib/tours/employee-tour"

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
const errorInputClass = "border-[#b75c68] focus:border-[#b75c68] focus:ring-[#b75c68]/20"
const labelClass = "mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-[#6b6f76]"
type FormErrors = Partial<Record<"serviceId" | "employeeId" | "name" | "email" | "date" | "time" | "line1" | "city" | "postal", string>>

interface NewBookingFormProps {
  // staff: books onto the signed-in tech's own schedule. admin: picks the tech.
  mode: "staff" | "admin"
  initialDate?: string
  initialTime?: string
  initialEmployeeId?: number
}

const COPY = {
  staff: {
    subtitle: "Book a client in manually. This goes straight onto your schedule.",
    backHref: "/dashboard/employee",
    done: "The appointment has been added to your schedule for",
  },
  admin: {
    subtitle: "Book a client in for any technician. This goes straight onto their schedule.",
    backHref: "/dashboard/admin/calendar",
    done: "The appointment has been added to the technician's schedule for",
  },
} as const

// Manual (force) booking by staff or an admin. Skips assignment eligibility, but
// the database still rejects a clash with the tech's other bookings.
export function NewBookingForm({ mode, initialDate = "", initialTime = "10:00", initialEmployeeId }: NewBookingFormProps) {
  const { toast } = useToast()
  const qc = useQueryClient()
  const copy = COPY[mode]
  const { data: employees } = useAdminEmployees(1, mode === "admin")
  const [employeeId, setEmployeeId] = useState(initialEmployeeId ? String(initialEmployeeId) : "")
  const { data: services = [], isError: isServicesError } = useQuery<ApiService[]>({
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
  const [date, setDate] = useState(initialDate)
  const [time, setTime] = useState(initialTime)
  const [line1, setLine1] = useState("")
  const [city, setCity] = useState("")
  const [province, setProvince] = useState("ON")
  const [postal, setPostal] = useState("")
  const [notes, setNotes] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<FormErrors>({})
  const [done, setDone] = useState(false)
  const today = getTodayInputDate()

  useEffect(() => {
    if (isServicesError) {
      toast({
        title: "Services not loaded",
        description: "Could not load services for manual booking.",
        variant: "error",
      })
    }
  }, [isServicesError, toast])

  function submit() {
    setError(null)
    const nextErrors = validateForm({
      city,
      date,
      email,
      line1,
      name,
      postal,
      serviceId,
      time,
    })

    if (mode === "admin" && !employeeId) nextErrors.employeeId = "Choose a technician."

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      toast({
        title: "Booking needs attention",
        description: "Check the highlighted fields and try again.",
        variant: "error",
      })
      return
    }

    setErrors({})
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
      employee_id: mode === "admin" ? Number(employeeId) : undefined,
    }
    createBooking.mutate(input, {
      onSuccess: () => {
        if (mode === "admin") qc.invalidateQueries({ queryKey: ["admin-bookings"] })
        setDone(true)
        toast({ title: "Booking created", variant: "success" })
      },
      onError: (e: unknown) => {
        const message = getApiErrorMessage(e, "Couldn't create the booking. Please try again.")
        setError(message)
        toast({ title: "Booking not created", description: message, variant: "error" })
      },
    })
  }

  function clearError(field: keyof FormErrors) {
    setErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  function resetForm() {
    setDone(false)
    setServiceId("")
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
    setError(null)
    setErrors({})
  }

  if (done) {
    return (
      <DashboardPage maxWidth="narrow">
        <DashboardPanel>
          <div className="py-8 text-center">
            <CheckCircle2 className="mx-auto mb-3 size-9 text-emerald-600" />
            <h2 className="text-xl font-black tracking-tight text-[#101217]">Booking created</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm font-medium text-[#5f6268]">
              {copy.done}{" "}
              <span className="font-bold text-[#101217]">{name || email}</span>.
            </p>
            <div className="mt-5 flex justify-center gap-2">
              <Link href={copy.backHref} className="inline-flex h-10 items-center bg-[#101217] px-4 text-sm font-bold text-white">
                Back
              </Link>
              <button
                type="button"
                onClick={resetForm}
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
      <div data-tour="new-booking-header">
        <DashboardHeader
          title="New booking"
          subtitle={copy.subtitle}
          actions={
            <Link href={copy.backHref} className="inline-flex h-10 items-center gap-1 border border-black/15 bg-white px-4 text-sm font-bold text-[#101217]">
              <ChevronLeft className="size-4" /> Back
            </Link>
          }
        />
      </div>

      <DashboardPanel data-tour="new-booking-form">
        <div className="grid gap-5">
          {mode === "admin" ? (
            <div>
              <label className={labelClass} htmlFor="new-booking-tech">Technician *</label>
              <select
                id="new-booking-tech"
                aria-invalid={Boolean(errors.employeeId)}
                className={fieldClass(errors.employeeId)}
                value={employeeId}
                onChange={(e) => {
                  setEmployeeId(e.target.value)
                  clearError("employeeId")
                }}
              >
                <option value="">Select a technician...</option>
                {(employees?.data ?? []).map((ep) => (
                  <option key={ep.id} value={ep.id}>
                    {ep.name ?? `Tech #${ep.id}`}
                  </option>
                ))}
              </select>
              <FieldError message={errors.employeeId} />
            </div>
          ) : null}
          <div>
            <label className={labelClass}>Service</label>
            <Select
              onValueChange={(value) => {
                setServiceId(value ?? "")
                clearError("serviceId")
              }}
              value={serviceId}
            >
              <SelectTrigger aria-invalid={Boolean(errors.serviceId)}>
                <SelectValue placeholder="Select a service..." />
              </SelectTrigger>
              <SelectContent>
              {services.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.category_name ? `${s.category_name} · ` : ""}{s.name} ({s.duration_minutes} min)
                </SelectItem>
              ))}
              </SelectContent>
            </Select>
            <FieldError message={errors.serviceId} />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Client type</label>
              <Select onValueChange={(value) => setClientType(value ?? "adult")} value={clientType}>
                <SelectTrigger className="capitalize">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CLIENT_TYPES.map((t) => (
                    <SelectItem className="capitalize" key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {clientType === "group" ? (
              <div>
                <label className={labelClass}>Party size</label>
                <Select onValueChange={(value) => setPartySize(Number(value ?? 2))} value={String(partySize)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2, 3, 4, 5].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n} people
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Client name</label>
              <input
                aria-invalid={Boolean(errors.name)}
                className={fieldClass(errors.name)}
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  clearError("name")
                }}
                placeholder="First name"
              />
              <FieldError message={errors.name} />
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" inputMode="tel" />
            </div>
          </div>
          <div>
            <label className={labelClass}>Client email *</label>
            <input
              aria-invalid={Boolean(errors.email)}
              className={fieldClass(errors.email)}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                clearError("email")
              }}
              placeholder="name@email.com"
              type="email"
            />
            <FieldError message={errors.email} />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Date</label>
              <DatePicker
                className={errors.date ? errorInputClass : ""}
                min={today}
                placeholder="Select appointment date"
                value={date}
                onChange={(value) => {
                  setDate(value)
                  clearError("date")
                }}
              />
              <FieldError message={errors.date} />
            </div>
            <div>
              <label className={labelClass}>Time</label>
              <input
                aria-invalid={Boolean(errors.time)}
                type="time"
                className={fieldClass(errors.time)}
                value={time}
                onChange={(e) => {
                  setTime(e.target.value)
                  clearError("time")
                }}
              />
              <FieldError message={errors.time} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Service address</label>
            <input
              aria-invalid={Boolean(errors.line1)}
              className={fieldClass(errors.line1)}
              value={line1}
              onChange={(e) => {
                setLine1(e.target.value)
                clearError("line1")
              }}
              placeholder="Street address *"
            />
            <FieldError message={errors.line1} />
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            <div>
              <input
                aria-invalid={Boolean(errors.city)}
                className={fieldClass(errors.city)}
                value={city}
                onChange={(e) => {
                  setCity(e.target.value)
                  clearError("city")
                }}
                placeholder="City *"
              />
              <FieldError message={errors.city} />
            </div>
            <Select onValueChange={(value) => setProvince(value ?? "ON")} value={province}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROVINCES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div>
              <input
                aria-invalid={Boolean(errors.postal)}
                className={fieldClass(errors.postal)}
                value={postal}
                onChange={(e) => {
                  setPostal(e.target.value)
                  clearError("postal")
                }}
                placeholder="Postal code *"
              />
              <FieldError message={errors.postal} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Notes (optional)</label>
            <textarea className={`${inputClass} h-20 py-2`} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything the client mentioned" />
          </div>

          {error ? <p className="text-sm font-bold text-red-600">{error}</p> : null}

          <Button
            className="h-11 font-bold text-white"
            disabled={createBooking.isPending}
            onClick={submit}
            style={{ background: "#c96c83", border: "none" }}
          >
            {createBooking.isPending ? "Creating…" : "Create booking"}
          </Button>
        </div>
      </DashboardPanel>

      {mode === "staff" ? <TutorialButton steps={employeeNewBookingSteps} pageKey="employee-new-booking" /> : null}
    </DashboardPage>
  )
}

function getApiErrorMessage(error: unknown, fallback: string) {
  const data = (error as { response?: { data?: { error?: string; errors?: string[] } } })?.response?.data
  return data?.error ?? data?.errors?.join(", ") ?? fallback
}

function validateForm(values: {
  city: string
  date: string
  email: string
  line1: string
  name: string
  postal: string
  serviceId: string
  time: string
}) {
  const next: FormErrors = {}

  if (!values.serviceId) next.serviceId = "Select a service."
  if (!values.name.trim()) next.name = "Client name is required."
  if (!values.email.trim()) {
    next.email = "Client email is required."
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    next.email = "Enter a valid email address."
  }
  if (!values.date) {
    next.date = "Appointment date is required."
  } else if (isPastDate(values.date)) {
    next.date = "Date cannot be in the past."
  }
  if (!values.time) next.time = "Appointment time is required."
  if (!values.line1.trim()) next.line1 = "Street address is required."
  if (!values.city.trim()) next.city = "City is required."
  if (!values.postal.trim()) next.postal = "Postal code is required."

  return next
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="mt-1 text-xs font-semibold text-[#b75c68]">{message}</p> : null
}

function fieldClass(error?: string) {
  return `${inputClass} ${error ? errorInputClass : ""}`
}

function getTodayInputDate() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, "0")
  const day = String(today.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function isPastDate(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  if (!year || !month || !day) return false
  const date = new Date(year, month - 1, day)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return date < today
}
