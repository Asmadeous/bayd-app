"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"

export interface Shift {
  id: number
  status: "open" | "closed"
  clock_in_at: string
  clock_out_at: string | null
  clock_in_latitude: string | null
  clock_in_longitude: string | null
  clock_out_latitude: string | null
  clock_out_longitude: string | null
  distance_km: string
  fuel_reimbursement: string
  fuel_rate_per_km: string | null
  duration_seconds: number
  booking_id: number | null
  arrived_late: boolean
  notes: string | null
  employee_profile?: {
    id: number
    title: string | null
    user: { first_name: string | null; last_name: string | null; email: string }
  }
}

export interface ShiftTotals {
  shifts?: number // admin totals key
  shifts_count?: number // employee totals key
  hours_worked?: number
  distance_km: number
  fuel_reimbursement: number
  on_time_arrivals?: number
  late_arrivals?: number
  on_time_rate?: number | null
}

interface PagedShifts {
  data: Shift[]
  totals: ShiftTotals
  pagination: { current_page: number; per_page: number; total_count: number; total_pages: number; next_page: number | null }
}

interface Coords {
  latitude: number
  longitude: number
  accuracy_meters?: number
}

// Resolve the browser's current GPS position (prompts for permission).
export function getPosition(): Promise<Coords> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      reject(new Error("Location isn't available on this device"))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy_meters: Math.round(pos.coords.accuracy),
        }),
      (err) => reject(new Error(err.message || "Couldn't read your location. Please allow location access.")),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  })
}

// ── Employee self-service ─────────────────────────────────────────────────

export function useCurrentShift() {
  return useQuery({
    queryKey: ["current-shift"],
    queryFn: () => api.get<Shift | null>("/employee/current_shift").then((r) => r.data),
  })
}

export function useShifts(page = 1) {
  return useQuery({
    queryKey: ["shifts", page],
    queryFn: () => api.get<PagedShifts>("/employee/shifts", { params: { page } }).then((r) => r.data),
  })
}

// Per-booking clock in/out. Reads the device GPS and posts it to the booking's
// clock endpoint; the backend enforces the 150m geofence + 15-min grace and
// returns a 422 with a message when you're too far from the client.
function useBookingClock(action: "clock_in" | "clock_out") {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (bookingId: number) => {
      const loc = await getPosition()
      return api.post<Shift>(`/employee/bookings/${bookingId}/${action}`, loc).then((r) => r.data)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["current-shift"] })
      qc.invalidateQueries({ queryKey: ["shifts"] })
      qc.invalidateQueries({ queryKey: ["employee-schedule"] })
      qc.invalidateQueries({ queryKey: ["employee-profile"] })
    },
  })
}

export const useClockIn = () => useBookingClock("clock_in")
export const useClockOut = () => useBookingClock("clock_out")

// ── Admin fuel-compensation report ─────────────────────────────────────────

export interface AdminShiftFilters {
  employee_profile_id?: number | string
  status?: string
  from?: string
  to?: string
  page?: number
}

export function useAdminShifts(filters: AdminShiftFilters = {}) {
  return useQuery({
    queryKey: ["admin-shifts", filters],
    queryFn: () => api.get<PagedShifts>("/admin/shifts", { params: filters }).then((r) => r.data),
  })
}

export function useDeleteShift() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/admin/shifts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-shifts"] }),
  })
}
