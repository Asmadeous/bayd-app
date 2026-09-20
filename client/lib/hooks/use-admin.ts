"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import type { Booking } from "@/lib/hooks/use-bookings"
import type { EmployeeProfile } from "@/lib/hooks/use-employee"
import type { Invoice } from "@/lib/hooks/use-invoices"
import type { GiftCard } from "@/lib/hooks/use-gift-cards"
import type { Subscription } from "@/lib/hooks/use-subscriptions"

interface PagedResponse<T> {
  data: T[]
  pagination: { current_page: number; per_page: number; total_count: number; total_pages: number; next_page: number | null }
}

// ── Analytics / KPIs ──────────────────────────────────────────────────────────

export type AnalyticsPeriod = "7d" | "30d" | "90d" | "ytd" | "all"

export interface AnalyticsSummary {
  service_revenue: number
  product_revenue: number
  total_revenue: number
  completed_bookings: number
  new_customers: number
  average_rating: number | null
  completion_rate: number | null
}

export interface AnalyticsEmployee {
  id: number
  name: string
  title: string | null
  bookings_completed: number
  revenue: number
  cancellations: number
  missed: number
  average_rating: number | null
}

export interface AnalyticsInvoices {
  count: number
  total_invoiced: number
  tax_collected: number
  by_kind: Record<string, number>
}

export interface AnalyticsResponse {
  period: AnalyticsPeriod
  range: { start: string | null; end: string }
  summary: AnalyticsSummary
  invoices: AnalyticsInvoices
  employees: AnalyticsEmployee[]
  revenue_trend: { date: string; revenue: number }[]
  top_services: { name: string; bookings: number; revenue: number }[]
}

export function useAdminAnalytics(period: AnalyticsPeriod = "30d") {
  return useQuery({
    queryKey: ["admin-analytics", period],
    queryFn: () =>
      api.get<AnalyticsResponse>("/admin/analytics", { params: { period } }).then((r) => r.data),
  })
}

export interface EmployeeAnalytics {
  employee: { id: number; name: string; title: string | null; photo_url: string | null }
  period: AnalyticsPeriod
  range: { start: string | null; end: string }
  summary: {
    completed_bookings: number
    revenue: number
    average_rating: number | null
    reviews_count: number
    cancellations: number
    no_shows: number
    missed: number
    completion_rate: number | null
    upcoming_count: number
  }
  rating_breakdown: Record<string, number>
  revenue_trend: { date: string; revenue: number }[]
  top_services: { name: string; bookings: number; revenue: number }[]
  recent_reviews: { id: number; rating: number; body: string | null; reviewer_name: string; created_at: string }[]
  upcoming: { id: number; service_name: string | null; client_name: string; starts_at: string; total: number }[]
}

export function useAdminEmployeeAnalytics(id: number | string, period: AnalyticsPeriod = "30d") {
  return useQuery({
    queryKey: ["admin-employee-analytics", String(id), period],
    queryFn: () =>
      api
        .get<EmployeeAnalytics>(`/admin/employees/${id}/analytics`, { params: { period } })
        .then((r) => r.data),
    enabled: !!id,
  })
}

// ── Bookings ────────────────────────────────────────────────────────────────

export function useAdminBookings(params?: { status?: string; employee_id?: number; page?: number }) {
  return useQuery({
    queryKey: ["admin-bookings", params],
    queryFn: () => api.get<PagedResponse<Booking>>("/admin/bookings", { params }).then((r) => r.data),
  })
}

export function useUpdateBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, cancellation_reason }: { id: number; status: string; cancellation_reason?: string }) =>
      api.patch<Booking>(`/admin/bookings/${id}`, { status, cancellation_reason }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-bookings"] }),
  })
}

// Admin reschedule: no cutoff, no cap, and an optional tech move via
// employee_profile_id. Hits the admin endpoint; re-validates travel + double-
// booking server-side.
export function useAdminRescheduleBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, starts_at, employee_profile_id }: { id: number; starts_at: string; employee_profile_id?: number }) =>
      api.post<Booking>(`/admin/bookings/${id}/reschedule`, { starts_at, employee_profile_id }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-bookings"] }),
  })
}

// ── Employees ───────────────────────────────────────────────────────────────

export function useAdminEmployees(page = 1) {
  return useQuery({
    queryKey: ["admin-employees", page],
    queryFn: () => api.get<PagedResponse<EmployeeProfile>>("/admin/employees", { params: { page } }).then((r) => r.data),
  })
}

export function useToggleEmployeeShift(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post<{ on_shift: boolean }>(`/admin/employees/${id}/toggle_shift`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-employees"] }),
  })
}

export interface EmployeeInput {
  email?: string
  first_name?: string
  last_name?: string
  phone?: string
  password?: string
  title?: string
  bio?: string
  active?: boolean
  dispatchable?: boolean
  partner_id?: number | null
  base_latitude?: string | null
  base_longitude?: string | null
  service_fsas?: string[]
}

export function useUpdateEmployee(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: EmployeeInput) =>
      api.patch<EmployeeProfile>(`/admin/employees/${id}`, { employee: data }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-employees"] }),
  })
}

export function useCreateEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: EmployeeInput) =>
      api.post<EmployeeProfile>("/admin/employees", { employee: data }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-employees"] }),
  })
}

export function useDeleteEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/admin/employees/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-employees"] }),
  })
}

// ── Reviews ─────────────────────────────────────────────────────────────────

export interface Review {
  id: number
  rating: number
  body: string | null
  approved: boolean
  featured: boolean
  created_at: string
  user: { first_name: string | null; last_name: string | null }
  employee_profile: { user: { first_name: string | null; last_name: string | null } }
}

export function useAdminReviews(params?: { approved?: boolean; page?: number }) {
  return useQuery({
    queryKey: ["admin-reviews", params],
    queryFn: () => api.get<PagedResponse<Review>>("/admin/reviews", { params }).then((r) => r.data),
  })
}

export function useApproveReview() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.post(`/admin/reviews/${id}/approve`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-reviews"] }),
  })
}

// ── Inquiries ────────────────────────────────────────────────────────────────

export function useAdminInquiries(type: "franchise" | "jobs" | "contacts", page = 1) {
  return useQuery({
    queryKey: ["admin-inquiries", type, page],
    queryFn: () =>
      api.get<PagedResponse<Record<string, unknown>>>(`/admin/inquiries/${type}`, { params: { page } }).then((r) => r.data),
  })
}

// ── Service Areas ────────────────────────────────────────────────────────────

export interface ServiceArea {
  id: number
  name: string
  slug: string
  travel_fee: string
  active: boolean
  center_latitude: string | null
  center_longitude: string | null
  radius_meters: number | null
  postal_codes: string[]
  postal_code_count: number
}

export function useAdminServiceAreas() {
  return useQuery({
    queryKey: ["admin-service-areas"],
    queryFn: () => api.get<ServiceArea[]>("/admin/service_areas").then((r) => r.data),
  })
}

export function useUpdateServiceArea() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: {
      id: number
      name?: string
      travel_fee?: string
      active?: boolean
      center_latitude?: string | null
      center_longitude?: string | null
      radius_meters?: number | null
      postal_codes?: string[]
    }) =>
      api.patch<ServiceArea>(`/admin/service_areas/${id}`, { service_area: data }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-service-areas"] }),
  })
}

// Real coverage map — derived from each tech's service_fsas (what booking
// eligibility actually checks), not the ServiceArea zones above.
export interface CoverageTech {
  employee_profile_id: number
  name: string | null
}

export function useServiceAreaCoverage() {
  return useQuery({
    queryKey: ["admin-service-area-coverage"],
    queryFn: () =>
      api
        .get<{ fsas: Record<string, CoverageTech[]>; configured: boolean }>("/admin/service_areas/coverage")
        .then((r) => r.data),
  })
}

// ── Careers: job postings + applications ──────────────────────────────────────

export interface AdminJobPosting {
  id: number
  title: string
  slug: string
  department: string | null
  location: string | null
  employment_type: string
  description: string | null
  requirements: string | null
  salary_min: string | null
  salary_max: string | null
  status: "draft" | "published" | "closed"
  applications_count?: number
  posted_at: string | null
  created_at?: string
}

export interface AdminJobApplication {
  id: number
  name: string
  email: string
  phone: string | null
  job_title: string | null
  message: string | null
  status: "unread" | "reviewing" | "rejected" | "hired"
  scan_status: "pending" | "clean" | "infected"
  created_at: string
  documents: { id: number; filename: string; byte_size: number; downloadable: boolean; download_path: string }[]
}

export function useAdminJobPostings(params?: { status?: string; employment_type?: string; department?: string; page?: number }) {
  return useQuery({
    queryKey: ["admin-job-postings", params],
    queryFn: () => api.get<PagedResponse<AdminJobPosting>>("/admin/job_postings", { params }).then((r) => r.data),
  })
}

export function useSaveJobPosting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<AdminJobPosting> & { id?: number }) =>
      (id
        ? api.patch<AdminJobPosting>(`/admin/job_postings/${id}`, { job_posting: data })
        : api.post<AdminJobPosting>("/admin/job_postings", { job_posting: data })
      ).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-job-postings"] }),
  })
}

export function useDeleteJobPosting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/admin/job_postings/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-job-postings"] }),
  })
}

export function useAdminJobApplications(params?: { status?: string; job_posting_id?: number; page?: number }) {
  return useQuery({
    queryKey: ["admin-job-applications", params],
    queryFn: () => api.get<PagedResponse<AdminJobApplication>>("/admin/job_applications", { params }).then((r) => r.data),
  })
}

export function useUpdateApplicationStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.patch(`/admin/job_applications/${id}`, { job_application: { status } }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-job-applications"] }),
  })
}

export function useDeleteApplication() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/admin/job_applications/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-job-applications"] }),
  })
}

// Authenticated, scan-gated download: fetch as a blob (so the JWT is sent) and
// trigger a browser save. download_path is relative to the API origin.
export async function downloadApplicationDocument(downloadPath: string, filename: string) {
  const path = downloadPath.replace(/^\/api\/v1/, "")
  const res = await api.get(path, { responseType: "blob" })
  const url = URL.createObjectURL(res.data as Blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ── Invoices / transactions ───────────────────────────────────────────────────

export function useAdminInvoices(params?: { status?: string; kind?: string; page?: number }) {
  return useQuery({
    queryKey: ["admin-invoices", params],
    queryFn: () => api.get<PagedResponse<Invoice>>("/admin/invoices", { params }).then((r) => r.data),
  })
}

export function useSaveInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Record<string, unknown> & { id?: number }) =>
      (id
        ? api.patch<Invoice>(`/admin/invoices/${id}`, { invoice: data })
        : api.post<Invoice>("/admin/invoices", { invoice: data })
      ).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-invoices"] }),
  })
}

export function useDeleteInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/admin/invoices/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-invoices"] }),
  })
}

export function useResendInvoice() {
  return useMutation({
    mutationFn: (id: number) => api.post(`/admin/invoices/${id}/resend`).then((r) => r.data),
  })
}

// ── Gift cards ────────────────────────────────────────────────────────────────

export function useAdminGiftCards(params?: { active?: string; page?: number }) {
  return useQuery({
    queryKey: ["admin-gift-cards", params],
    queryFn: () => api.get<PagedResponse<GiftCard>>("/admin/gift_cards", { params }).then((r) => r.data),
  })
}

export function useSaveGiftCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Record<string, unknown> & { id?: number }) =>
      (id
        ? api.patch<GiftCard>(`/admin/gift_cards/${id}`, data)
        : api.post<GiftCard>("/admin/gift_cards", data)
      ).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-gift-cards"] }),
  })
}

export function useDeleteGiftCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/admin/gift_cards/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-gift-cards"] }),
  })
}

export function useDeliverGiftCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.post(`/admin/gift_cards/${id}/deliver`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-gift-cards"] }),
  })
}

// Staff top-up: payment taken in person (POS/cash), credited immediately.
export function useTopupGiftCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { id: number; amount: number; method: string }) =>
      api.post(`/admin/gift_cards/${vars.id}/topup`, { amount: vars.amount, method: vars.method }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-gift-cards"] }),
  })
}

// ── Subscriptions ─────────────────────────────────────────────────────────────

export function useAdminSubscriptions(params?: { status?: string; page?: number }) {
  return useQuery({
    queryKey: ["admin-subscriptions", params],
    queryFn: () => api.get<PagedResponse<Subscription>>("/admin/subscriptions", { params }).then((r) => r.data),
  })
}

export function useUpdateSubscription() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Record<string, unknown> & { id: number }) =>
      api.patch<Subscription>(`/admin/subscriptions/${id}`, { subscription: data }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-subscriptions"] }),
  })
}

export function useCancelSubscriptionAdmin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.post(`/admin/subscriptions/${id}/cancel`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-subscriptions"] }),
  })
}

export function useDeleteSubscription() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/admin/subscriptions/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-subscriptions"] }),
  })
}
