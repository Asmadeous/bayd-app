"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import api from "@/lib/api"

// Times come back as "2000-01-01 09:00:00 UTC": a wall-clock time in the
// company zone that Rails stores on a dummy date. Only the HH:MM matters.
export function wallClock(value: string | null) {
  return value?.match(/(\d{2}:\d{2})/)?.[1] ?? ""
}

export interface WeeklyHours {
  id: number
  day_of_week: number
  start_time: string
  end_time: string
}

export interface DateOverride {
  id: number
  date: string
  available: boolean
  start_time: string | null
  end_time: string | null
}

const base = (employeeId: number) => `/admin/employees/${employeeId}`

export function useWeeklyHours(employeeId: number) {
  return useQuery({
    queryKey: ["staff-hours", employeeId],
    queryFn: () => api.get<WeeklyHours[]>(`${base(employeeId)}/availability_schedules`).then((r) => r.data),
  })
}

export function useDateOverrides(employeeId: number) {
  return useQuery({
    queryKey: ["staff-overrides", employeeId],
    queryFn: () => api.get<DateOverride[]>(`${base(employeeId)}/availability_overrides`).then((r) => r.data),
  })
}

export function useSaveWeeklyHours(employeeId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...hours }: { id?: number; day_of_week: number; start_time: string; end_time: string }) =>
      id
        ? api.patch(`${base(employeeId)}/availability_schedules/${id}`, { availability_schedule: hours })
        : api.post(`${base(employeeId)}/availability_schedules`, { availability_schedule: hours }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff-hours", employeeId] })
      qc.invalidateQueries({ queryKey: ["admin-bookable-windows"] })
    },
  })
}

export function useDeleteWeeklyHours(employeeId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`${base(employeeId)}/availability_schedules/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff-hours", employeeId] })
      qc.invalidateQueries({ queryKey: ["admin-bookable-windows"] })
    },
  })
}

export function useAddDateOverride(employeeId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (override: { date: string; available: boolean; start_time?: string; end_time?: string }) =>
      api.post(`${base(employeeId)}/availability_overrides`, { availability_override: override }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff-overrides", employeeId] })
      qc.invalidateQueries({ queryKey: ["admin-bookable-windows"] })
    },
  })
}

export function useDeleteDateOverride(employeeId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`${base(employeeId)}/availability_overrides/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff-overrides", employeeId] })
      qc.invalidateQueries({ queryKey: ["admin-bookable-windows"] })
    },
  })
}

export function useToggleDispatch(employeeId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post<{ dispatchable: boolean }>(`${base(employeeId)}/toggle_dispatch`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-employees"] }),
  })
}
