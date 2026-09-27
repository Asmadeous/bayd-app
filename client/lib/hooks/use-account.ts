"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import { usePagedList } from "@/lib/hooks/use-paged-list"

// ── Loyalty ───────────────────────────────────────────────────────────────────

export interface LoyaltyTransaction {
  id: number
  points: number
  kind: "earn" | "redeem" | "adjust"
  description: string | null
  created_at: string
}

export interface LoyaltyAccount {
  id: number
  points_balance: number
  loyalty_transactions: LoyaltyTransaction[]
}

export function useLoyalty() {
  return useQuery({
    queryKey: ["loyalty"],
    queryFn: () => api.get<LoyaltyAccount>("/loyalty").then((r) => r.data),
  })
}

// Points history, newest first, a page at a time for "Load more".
export function useLoyaltyHistory() {
  return usePagedList<LoyaltyTransaction>(["loyalty", "history"], (page) =>
    api
      .get<{ data: LoyaltyTransaction[]; pagination: { next_page: number | null } }>("/loyalty/transactions", { params: { page } })
      .then((r) => r.data),
  )
}

// ── Referral ──────────────────────────────────────────────────────────────────

export interface Referral {
  code: string
  url: string
  referrals_count: number
  points_per_referral: number
}

export function useReferral() {
  return useQuery({
    queryKey: ["referral"],
    queryFn: () => api.get<Referral>("/referral").then((r) => r.data),
  })
}

// ── Card on file ──────────────────────────────────────────────────────────────

export interface PaymentMethod {
  has_card: boolean
  brand: string | null
  last4: string | null
}

export function usePaymentMethod() {
  return useQuery({
    queryKey: ["payment-method"],
    queryFn: () => api.get<PaymentMethod>("/payment_method").then((r) => r.data),
  })
}

// Save a card on file. `source_id` is a single-use token from the Square Web
// Payments SDK (raw card data never touches our servers).
export function useSaveCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (source_id: string) =>
      api.post<PaymentMethod>("/payment_method", { source_id }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payment-method"] })
      qc.invalidateQueries({ queryKey: ["auth-me-card"] })
    },
  })
}

export function useRemoveCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.delete<PaymentMethod>("/payment_method").then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payment-method"] })
      qc.invalidateQueries({ queryKey: ["auth-me-card"] })
    },
  })
}

// ── Account deletion ─────────────────────────────────────────────────────────

export interface DeletionPreview {
  upcoming_bookings: { id: number; service: string | null; starts_at: string; paid: boolean }[]
  // Set when the account can't be deleted yet (staff with jobs, admins).
  blocked_reason: string | null
}

export function useDeletionPreview(enabled: boolean) {
  return useQuery({
    queryKey: ["account-deletion-preview"],
    queryFn: () => api.get<DeletionPreview>("/account/deletion_preview").then((r) => r.data),
    enabled,
  })
}

// Erases the signed-in user's account; the caller signs them out afterwards.
export function useDeleteAccount() {
  return useMutation({
    mutationFn: (confirm: string) => api.delete<{ deleted: true }>("/account", { data: { confirm } }).then((r) => r.data),
  })
}
