"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import type { EmployeeProfile } from "@/lib/hooks/use-employee"

export interface PartnerPending {
  booking_count: number
  gross: string
  fee: string
  owed: string
}

export interface Partner {
  id: number
  name: string
  slug: string
  email: string | null
  phone: string | null
  status: "active" | "inactive"
  platform_fee_pct: string
  payout_notes: string | null
  providers_count: number
  covered_fsas: string[]
  pending: PartnerPending
}

export interface PartnerPayout {
  id: number
  partner_id: number
  booking_count: number
  gross: string
  fee_amount: string
  amount: string
  platform_fee_pct: string
  status: "pending" | "paid"
  paid_at: string | null
  notes: string | null
  created_at: string
}

interface Paged<T> {
  data: T[]
  pagination: { current_page: number; per_page: number; total_count: number; total_pages: number; next_page: number | null }
}

export interface PartnerDetail {
  partner: Partner
  providers: EmployeeProfile[]
  payouts: PartnerPayout[]
}

export type PartnerInput = Partial<Pick<Partner, "name" | "email" | "phone" | "status" | "platform_fee_pct" | "payout_notes">>

export function useAdminPartners(page = 1) {
  return useQuery({
    queryKey: ["admin-partners", page],
    queryFn: () => api.get<Paged<Partner>>("/admin/partners", { params: { page } }).then((r) => r.data),
  })
}

export function usePartnerDetail(id: number | null) {
  return useQuery({
    queryKey: ["admin-partner", id],
    queryFn: () => api.get<PartnerDetail>(`/admin/partners/${id}/detail`).then((r) => r.data),
    enabled: !!id,
  })
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["admin-partners"] })
  qc.invalidateQueries({ queryKey: ["admin-partner"] })
}

export function useCreatePartner() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: PartnerInput) => api.post<Partner>("/admin/partners", { partner: data }).then((r) => r.data),
    onSuccess: () => invalidate(qc),
  })
}

export function useUpdatePartner() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: PartnerInput & { id: number }) =>
      api.patch<Partner>(`/admin/partners/${id}`, { partner: data }).then((r) => r.data),
    onSuccess: () => invalidate(qc),
  })
}

export function useDeletePartner() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/admin/partners/${id}`),
    onSuccess: () => invalidate(qc),
  })
}

export function useSettlePartner() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.post<PartnerPayout>(`/admin/partners/${id}/settle`).then((r) => r.data),
    onSuccess: () => invalidate(qc),
  })
}

export function useMarkPayoutPaid() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, notes }: { id: number; notes?: string }) =>
      api.post<PartnerPayout>(`/admin/partner_payouts/${id}/mark_paid`, { notes }).then((r) => r.data),
    onSuccess: () => invalidate(qc),
  })
}
