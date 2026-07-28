"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"

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

// Backend creates a Moneris hosted tokenization session and returns its URL;
// the frontend just redirects there to capture/vault the card.
export function useCardSession() {
  return useMutation({
    mutationFn: () =>
      api.post<{ redirect_url: string }>("/payment_method/session").then((r) => r.data),
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
