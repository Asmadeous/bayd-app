"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"

export interface SubscriptionHistoryEntry {
  booking_id: number
  date: string
  status: string
  amount: number
  paid: boolean
  paid_at: string | null
  processor: string | null
}

export interface Subscription {
  id: number
  service_name: string | null
  address_label: string | null
  interval_unit: "day" | "week" | "month" | "year"
  interval_count: number
  frequency_label: string
  status: "active" | "paused" | "cancelled"
  next_run_at: string
  auto_charge: boolean
  price: string | null
  next_charge: { on: string; amount: string | null } | null
  started_at: string | null
  last_booking_at: string | null
  created_at: string
  customer?: { id: number; name: string; email: string }
  history?: SubscriptionHistoryEntry[]
}

export function useSubscriptions() {
  return useQuery({
    queryKey: ["subscriptions"],
    queryFn: () => api.get<{ data: Subscription[] }>("/subscriptions").then((r) => r.data.data),
  })
}

// Detail incl. billing/appointment history.
export function useSubscription(id: number | null) {
  return useQuery({
    queryKey: ["subscription", id],
    queryFn: () => api.get<Subscription>(`/subscriptions/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}

function useAction(action: "pause" | "resume" | "cancel" | "skip") {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.post(`/subscriptions/${id}/${action}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["subscriptions"] }),
  })
}

export const usePauseSubscription = () => useAction("pause")
export const useResumeSubscription = () => useAction("resume")
export const useCancelSubscription = () => useAction("cancel")
export const useSkipSubscription = () => useAction("skip")

export const FREQUENCY_PRESETS = [
  { label: "Daily", unit: "day", count: 1 },
  { label: "Weekly", unit: "week", count: 1 },
  { label: "Every 2 weeks", unit: "week", count: 2 },
  { label: "Monthly", unit: "month", count: 1 },
  { label: "Every 3 months", unit: "month", count: 3 },
  { label: "Every 6 months", unit: "month", count: 6 },
  { label: "Yearly", unit: "year", count: 1 },
] as const

export function useChangeFrequency() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, unit, count }: { id: number; unit: string; count: number }) =>
      api.post(`/subscriptions/${id}/change_frequency`, { interval_unit: unit, interval_count: count }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["subscriptions"] }),
  })
}
