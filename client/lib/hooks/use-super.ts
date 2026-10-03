"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import api from "@/lib/api"

// The super admin console: every franchise, its setup, admins and royalties.

export interface Franchise {
  id: number
  name: string
  slug: string
  status: "draft" | "live" | "suspended"
  is_default: boolean
  country_code: string
  currency: string
  locale: string
  time_zone: string
  open_hour: number
  close_hour: number
  tax_name: string | null
  tax_rate: string
  tax_registration_number: string | null
  contact_email: string | null
  contact_phone: string | null
  reply_to_email: string | null
  sender_name: string | null
  sms_sender: string | null
  staff_email_domain: string | null
  subdomain: string | null
  custom_domain: string | null
  royalty_pct: string
  privacy_body: string | null
  terms_body: string | null
  business_address: string | null
  created_at: string
  // Whether each Square key is stored; the keys themselves never come back.
  credential_status: { square: Record<string, boolean> }
  readiness: { admin: boolean; payments: boolean; services: boolean; technicians: boolean; legal: boolean }
  web_origins: string[]
  webhook_urls: { square: string }
  admins: { id: number; email: string; first_name: string | null; last_name: string | null; created_at: string }[]
}

export type FranchiseInput = Partial<
  Pick<
    Franchise,
    | "name" | "slug" | "country_code" | "currency" | "locale" | "time_zone" | "open_hour" | "close_hour"
    | "tax_name" | "tax_rate" | "tax_registration_number" | "contact_email" | "contact_phone" | "reply_to_email"
    | "sender_name" | "sms_sender" | "staff_email_domain" | "subdomain" | "custom_domain" | "royalty_pct"
    | "privacy_body" | "terms_body" | "business_address"
  >
>

export const SQUARE_KEYS = ["access_token", "location_id", "application_id", "environment", "webhook_signature_key"] as const

export interface BranchRow {
  id: number
  name: string
  slug: string
  status: Franchise["status"]
  currency: string
  bookings: number
  completed: number
  cancelled: number
  booked_value: string
  received: string
  customers: number
  technicians: number
  royalty_pct: string
  royalty_estimate: string
}

export interface RoyaltyStatement {
  id: number
  franchise_id?: number
  franchise_name?: string
  period_start: string
  period_end: string
  gross: string
  refunds: string
  royalty_pct: string
  royalty_due: string
  currency: string
  status: "open" | "paid"
  paid_at: string | null
}

const invalidate = (qc: ReturnType<typeof useQueryClient>) => qc.invalidateQueries({ queryKey: ["super"] })

export function useFranchises(enabled = true) {
  return useQuery({
    queryKey: ["super", "franchises"],
    queryFn: () => api.get<Franchise[]>("/super/franchises").then((r) => r.data),
    enabled,
  })
}

export function useFranchise(id: number) {
  return useQuery({
    queryKey: ["super", "franchise", id],
    queryFn: () => api.get<Franchise>(`/super/franchises/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}

export function useCreateFranchise() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (franchise: FranchiseInput) => api.post<Franchise>("/super/franchises", { franchise }).then((r) => r.data),
    onSuccess: () => invalidate(qc),
  })
}

export function useUpdateFranchise(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (franchise: FranchiseInput) => api.patch<Franchise>(`/super/franchises/${id}`, { franchise }).then((r) => r.data),
    onSuccess: () => invalidate(qc),
  })
}

export function useSaveSquareKeys(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (values: Partial<Record<(typeof SQUARE_KEYS)[number], string>>) =>
      api.post<Franchise>(`/super/franchises/${id}/credentials`, { provider: "square", values }).then((r) => r.data),
    onSuccess: () => invalidate(qc),
  })
}

export function useTestPayments(id: number) {
  return useMutation({
    mutationFn: () => api.post<{ ok: boolean; message: string }>(`/super/franchises/${id}/test_payments`).then((r) => r.data),
  })
}

export function useCopyCatalog(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (fromFranchiseId?: number) =>
      api.post<{ copied: number }>(`/super/franchises/${id}/copy_catalog`, { from_franchise_id: fromFranchiseId }).then((r) => r.data),
    onSuccess: () => invalidate(qc),
  })
}

export function useFranchiseStatus(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (action: "go_live" | "suspend") => api.post<Franchise>(`/super/franchises/${id}/${action}`).then((r) => r.data),
    onSuccess: () => invalidate(qc),
  })
}

export function useInviteAdmin(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (admin: { email: string; first_name: string; last_name?: string; phone?: string }) =>
      api.post<Franchise>(`/super/franchises/${id}/admins`, admin).then((r) => r.data),
    onSuccess: () => invalidate(qc),
  })
}

export function useRemoveAdmin(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: number) => api.delete<Franchise>(`/super/franchises/${id}/admins/${userId}`).then((r) => r.data),
    onSuccess: () => invalidate(qc),
  })
}

export function useBranchAnalytics(month: string) {
  return useQuery({
    queryKey: ["super", "analytics", month],
    queryFn: () => api.get<{ month: string; franchises: BranchRow[] }>("/super/analytics", { params: { month } }).then((r) => r.data),
  })
}

export function useRoyaltyStatements(franchiseId?: number, enabled = true) {
  return useQuery({
    queryKey: ["super", "royalties", franchiseId ?? "all"],
    queryFn: () =>
      api.get<RoyaltyStatement[]>("/super/royalty_statements", { params: { franchise_id: franchiseId } }).then((r) => r.data),
    enabled,
  })
}

export function useGenerateStatement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ franchiseId, month }: { franchiseId: number; month: string }) =>
      api.post<RoyaltyStatement>(`/super/franchises/${franchiseId}/royalty_statements`, { month }).then((r) => r.data),
    onSuccess: () => invalidate(qc),
  })
}

export function useMarkStatementPaid() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.post<RoyaltyStatement>(`/super/royalty_statements/${id}/mark_paid`).then((r) => r.data),
    onSuccess: () => invalidate(qc),
  })
}

// A franchise admin's own statements.
export function useMyRoyaltyStatements(enabled = true) {
  return useQuery({
    queryKey: ["admin-royalties"],
    queryFn: () => api.get<RoyaltyStatement[]>("/admin/royalty_statements").then((r) => r.data),
    enabled,
  })
}
