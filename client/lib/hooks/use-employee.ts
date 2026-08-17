"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import type { Booking } from "@/lib/hooks/use-bookings"

interface EmployeeProfile {
  id: number
  title: string | null
  bio: string | null
  photo_url: string | null
  years_experience: number | null
  on_shift: boolean
  active: boolean
  dispatchable: boolean
  base_latitude: string | null
  base_longitude: string | null
  simplybook_unit_id: string | null
  traccar_device_id: string | null
  service_fsas: string[]
  partner_id: number | null
  partner_name: string | null
  user: { first_name: string | null; last_name: string | null; email: string; phone: string | null }
}

interface PagedResponse<T> {
  data: T[]
  pagination: { current_page: number; per_page: number; total_count: number; total_pages: number; next_page: number | null }
}

export function useEmployeeProfile() {
  return useQuery({
    queryKey: ["employee-profile"],
    queryFn: () => api.get<EmployeeProfile>("/employee/profile").then((r) => r.data),
  })
}

export function useEmployeeSchedule(page = 1) {
  return useQuery({
    queryKey: ["employee-schedule", page],
    queryFn: () => api.get<PagedResponse<Booking>>("/employee/schedule", { params: { page } }).then((r) => r.data),
  })
}

export function useToggleShift() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post<{ on_shift: boolean }>("/employee/toggle_shift").then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employee-profile"] }),
  })
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { title?: string; bio?: string; photo_url?: string }) =>
      api.patch<EmployeeProfile>("/employee/profile", { employee: data }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employee-profile"] }),
  })
}

export interface StaffBookingInput {
  service_id: number
  starts_at: string // ISO datetime
  customer: { email: string; first_name?: string; phone?: string }
  client_type?: string
  party_size?: number
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
