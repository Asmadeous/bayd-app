"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"

export interface Meeting {
  id: number
  room_name: string
  provider: string
  status: "scheduled" | "completed" | "cancelled"
  scheduled_at: string | null
  started_at: string | null
  ended_at: string | null
  booking_id: number
  url: string
  // The room opens this long before scheduled_at (Meeting::JOIN_LEAD_MIN).
  join_opens_at: string | null
}

interface PagedMeetings {
  data: Meeting[]
  pagination: { current_page: number; per_page: number; total_count: number; total_pages: number; next_page: number | null }
}

// A call time: company-zone wall clock ("2026-10-08T15:30"), or "now".
export type CallTime = string | "now"

function refreshBookings(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["bookings"] })
  qc.invalidateQueries({ queryKey: ["booking"] })
  qc.invalidateQueries({ queryKey: ["employee-schedule"] })
  qc.invalidateQueries({ queryKey: ["employee-booking"] })
}

// Set up the booking's work-scope call for a chosen time (or now). Idempotent:
// an existing call is returned as it is.
export function useStartMeeting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ bookingId, at }: { bookingId: number; at: CallTime }) =>
      api
        .post<Meeting>(`/bookings/${bookingId}/meeting`, at === "now" ? { now: true } : { scheduled_at: at })
        .then((r) => r.data),
    onSuccess: () => refreshBookings(qc),
  })
}

// Move the call to a new time; both people are told.
export function useRescheduleMeeting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ meetingId, at }: { meetingId: number; at: CallTime }) =>
      api.patch<Meeting>(`/meetings/${meetingId}`, at === "now" ? { now: true } : { scheduled_at: at }).then((r) => r.data),
    onSuccess: () => refreshBookings(qc),
  })
}

export function useAdminMeetings(params: { status?: string; page?: number } = {}) {
  return useQuery({
    queryKey: ["admin-meetings", params],
    queryFn: () => api.get<PagedMeetings>("/admin/meetings", { params }).then((r) => r.data),
  })
}

export function useDeleteMeeting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/admin/meetings/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-meetings"] }),
  })
}
