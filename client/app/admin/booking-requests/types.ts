import { formatBookingDate, formatBookingTime } from "@/lib/booking-time"

// The shapes the web Booking Requests page reads from /admin/booking_requests.
export type BookingRequestStatus = "pending" | "assigned" | "booked" | "no_coverage" | "no_availability" | "failed"

type Person = { first_name: string | null; last_name: string | null; email: string }

export interface BookingRequest {
  id: number
  status: BookingRequestStatus
  kind: string
  requested_start: string | null
  requested_window_end: string | null
  created_at: string
  user: Person
  service: { name: string }
  address: { line1?: string | null; line2?: string | null; city?: string | null; province?: string | null; postal_code?: string | null } | null
  assigned_employee?: { user?: Person } | null
}

export interface AssignmentAttempt {
  id: number
  reason: string | null
  candidates: { employee_id?: number; distance_km?: number | null; source?: string | null }[]
  chosen_employee?: { user?: Person } | null
}

export type BookingRequestDetail = BookingRequest & { assignment_attempts: AssignmentAttempt[] }

export const STATUSES: BookingRequestStatus[] = ["pending", "assigned", "booked", "no_coverage", "no_availability", "failed"]

export const formatStatus = (value: string) => value.replace(/_/g, " ")

export function personName(person?: Person | null) {
  if (!person) return ""
  return [person.first_name, person.last_name].filter(Boolean).join(" ") || person.email
}

export function formatAddress(address: BookingRequest["address"]) {
  if (!address) return "No address"
  return [address.line1, address.line2, address.city, address.province, address.postal_code].filter(Boolean).join(", ") || "No address"
}

// In the franchise's clock, like every other booking time in the app.
export function formatWhen(iso: string) {
  return `${formatBookingDate(iso, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}, ${formatBookingTime(iso)}`
}
