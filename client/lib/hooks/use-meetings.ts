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
}

interface PagedMeetings {
  data: Meeting[]
  pagination: { current_page: number; per_page: number; total_count: number; total_pages: number; next_page: number | null }
}

// Start (or fetch the existing) work-scope video call for a booking. Idempotent.
export function useStartMeeting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (bookingId: number) =>
      api.post<Meeting>(`/bookings/${bookingId}/meeting`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] })
      qc.invalidateQueries({ queryKey: ["employee-schedule"] })
    },
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
