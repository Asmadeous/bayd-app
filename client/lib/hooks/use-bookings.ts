"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import type { Meeting } from "@/lib/hooks/use-meetings"

export interface Booking {
  id: number
  status: "pending" | "confirmed" | "in_progress" | "completed" | "cancelled" | "no_show"
  starts_at: string
  ends_at: string
  subtotal: string
  travel_fee: string
  total: string
  outstanding_balance: string
  notes: string | null
  cancellation_reason: string | null
  has_review: boolean
  client_type: "adult" | "kids" | "elderly" | "group"
  party_size: number
  meeting_recommended: boolean
  recurrence_active: boolean
  recurrence_interval_weeks: number | null
  auto_charge: boolean
  reschedule_count: number
  overtime_amount: string
  // Per-booking money picture, rendered per account type (the two never mix).
  financials:
    | {
        account_type: "direct"
        total: string
        amount_paid: string
        outstanding: string
        tips: string
        fuel_reimbursement: string
      }
    | {
        account_type: "partner"
        total: string
        amount_paid: string
        outstanding: string
        partner_name: string
        platform_fee_pct: string
        provider_share: string
        payout_status: "settled" | "owed"
      }
  // Extra services in this visit (same tech, back-to-back). Note-only, priced.
  addons: { id: number; name: string; price: string; duration: number }[]
  clocked_in_at: string | null
  service_latitude: string | null
  service_longitude: string | null
  customer_name: string | null
  address: {
    id: number
    label: string | null
    line1: string
    line2: string | null
    city: string
    province: string
    postal_code: string
    latitude: string | null
    longitude: string | null
    is_apartment: boolean
    buzz_code: string | null
  } | null
  created_at: string
  service: { id: number; name: string; duration_minutes: number; price: string; image_url: string | null }
  employee_profile: {
    id: number
    title: string | null
    photo_url: string | null
    user: { id: number; first_name: string | null; last_name: string | null }
  }
  meeting: Meeting | null
}

interface PagedResponse<T> {
  data: T[]
  pagination: { current_page: number; per_page: number; total_count: number; total_pages: number; next_page: number | null }
}

export function useBookings(page = 1) {
  return useQuery({
    queryKey: ["bookings", page],
    queryFn: () => api.get<PagedResponse<Booking>>("/bookings", { params: { page } }).then((r) => r.data),
  })
}

export function useBooking(id: number) {
  return useQuery({
    queryKey: ["booking", id],
    queryFn: () => api.get<Booking>(`/bookings/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}

export function useCancelBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      api.post<Booking>(`/bookings/${id}/cancel`, { reason }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
  })
}

// Customer self-reschedule: POST /bookings/:id/reschedule with the new local
// wall-clock start ("YYYY-MM-DDTHH:MM:SS"). The backend enforces the 24h cutoff
// and the 2-reschedule cap and returns a typed `code` on failure.
export function useRescheduleBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, starts_at }: { id: number; starts_at: string }) =>
      api.post<Booking>(`/bookings/${id}/reschedule`, { starts_at }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
  })
}

export function useSubmitReview() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ bookingId, rating, body }: { bookingId: number; rating: number; body?: string }) =>
      api
        .post(`/reviews`, { booking_id: bookingId, review: { rating, body } })
        .then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
  })
}
