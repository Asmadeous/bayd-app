"use client"

import { keepPreviousData, useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import type { Booking } from "@/lib/hooks/use-bookings"
import type { OfflinePaymentMethod } from "@/lib/payment-methods"

interface EmployeeProfile {
  id: number
  // First name, from the serializer's global (customer-safe) fields.
  name: string | null
  title: string | null
  bio: string | null
  photo_url: string | null
  years_experience: number | null
  on_shift: boolean
  active: boolean
  dispatchable: boolean
  base_latitude: string | null
  base_longitude: string | null
  service_fsas: string[]
  partner_id: number | null
  partner_name: string | null
  user: { first_name: string | null; last_name: string | null; email: string; phone: string | null }
  // The services this tech performs - the add-on candidates when they book a client.
  services: { id: number; name: string; duration_minutes: number; price: string; category_name: string | null }[]
}

interface PagedResponse<T> {
  data: T[]
  pagination: { current_page: number; per_page: number; total_count: number; total_pages: number; next_page: number | null }
}

// Rendered according to account type — a direct tech and a partner provider get
// mutually-exclusive shapes (the two never mix).
export type EmployeeEarnings =
  | {
      account_type: "direct"
      tips: { owed: string; paid_out: string }
      fuel_reimbursement: number
    }
  | {
      account_type: "partner"
      partner: {
        name: string
        platform_fee_pct: string
        share_pct: string
        owed: string
        gross_unsettled: string
        unsettled_count: number
        paid_out: string
      }
    }

// The tech's own money: card tips owed/paid, fuel reimbursement, and (partner
// providers only) the partner payout at the platform-fee split.
export function useEmployeeEarnings() {
  return useQuery({
    queryKey: ["employee-earnings"],
    queryFn: () => api.get<EmployeeEarnings>("/employee/earnings").then((r) => r.data),
  })
}

export function useEmployeeProfile(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["employee-profile"],
    queryFn: () => api.get<EmployeeProfile>("/employee/profile").then((r) => r.data),
    enabled: options?.enabled ?? true,
  })
}

// filter "past" returns the tech's job history (completed/cancelled/no-show);
// omitted returns the active working schedule.
// A single one of the tech's OWN bookings — for the navigate / call screens.
// The customer GET /bookings/:id is scoped to the customer and returns nothing
// for a staff user, so staff must use this employee-scoped endpoint.
export function useEmployeeBooking(id: number) {
  return useQuery({
    queryKey: ["employee-booking", id],
    queryFn: () => api.get<Booking>(`/employee/bookings/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}

export function useEmployeeSchedule(page = 1, filter?: "past") {
  return useQuery({
    queryKey: ["employee-schedule", page, filter ?? "active"],
    queryFn: () =>
      api
        .get<PagedResponse<Booking>>("/employee/schedule", { params: { page, filter } })
        .then((r) => r.data),
  })
}

export function useToggleShift() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post<{ on_shift: boolean }>("/employee/toggle_shift").then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employee-profile"] }),
  })
}

// Staff-operated card checkout for a booking: returns a hosted-checkout link for
// the balance. The tech opens it and enters the CLIENT'S card there (the payment
// is the customer's, staff just runs the terminal). No card-on-file auto-charge.
// Calendar: the tech's own jobs in [from, to], any status (past and cancelled
// included). Shares the "employee-schedule" key prefix so every schedule
// mutation refreshes it too.
export function useEmployeeScheduleRange(from: string, to: string) {
  return useQuery({
    queryKey: ["employee-schedule", "range", from, to],
    placeholderData: keepPreviousData,
    queryFn: () =>
      api.get<{ data: Booking[] }>("/employee/schedule", { params: { from, to } }).then((r) => r.data.data),
  })
}

export function useChargeBooking() {
  return useMutation({
    mutationFn: (bookingId: number) =>
      api
        .post<{ mode: string; url: string }>(`/employee/bookings/${bookingId}/payment_link`)
        .then((r) => r.data),
  })
}

// Cash / Interac e-Transfer / cheque collected in person: marks the booking paid
// with that method. Card goes through useChargeBooking (hosted checkout).
export function useRecordPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ bookingId, method, amount }: { bookingId: number; method: OfflinePaymentMethod; amount?: number }) =>
      api.post(`/employee/bookings/${bookingId}/record_payment`, { method, amount }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employee-schedule"] }),
  })
}

// The tech self-reports a booking they couldn't attend (missed). The client is
// never charged; the customer is notified and offered a reschedule server-side.
export function useMarkMissed() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (bookingId: number) =>
      api.post<Booking>(`/employee/bookings/${bookingId}/missed`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employee-schedule"] }),
  })
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { title?: string; bio?: string; photo_url?: string; photo?: File | null }) => {
      const { photo, ...fields } = data
      if (!photo) return api.patch<EmployeeProfile>("/employee/profile", { employee: fields }).then((r) => r.data)

      const payload = new FormData()
      Object.entries(fields).forEach(([key, value]) => {
        if (value !== undefined) payload.append(`employee[${key}]`, String(value))
      })
      payload.append("photo", photo)
      return api
        .patch<EmployeeProfile>("/employee/profile", payload, { headers: { "Content-Type": "multipart/form-data" } })
        .then((r) => r.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employee-profile"] }),
  })
}

export interface StaffBookingInput {
  service_id: number
  starts_at: string // ISO datetime
  customer: { email: string; first_name?: string; phone?: string }
  client_type?: string
  party_size?: number
  addon_service_ids?: number[]
  address?: {
    line1: string
    city: string
    province: string
    postal_code: string
    line2?: string
    is_apartment?: boolean
    buzz_code?: string
  }
  notes?: string
  employee_id?: number
}

// Staff-initiated manual booking (force-book). Creates a booking directly for
// the acting tech, skipping the customer-flow eligibility gates.
export function useCreateStaffBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: StaffBookingInput) =>
      api.post<Booking>("/employee/bookings", input).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employee-schedule"] }),
  })
}

export type { EmployeeProfile }
