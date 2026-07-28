"use client"

import { useQuery } from "@tanstack/react-query"
import api from "@/lib/api"

export interface InvoiceLineItem {
  description: string
  quantity: number
  unit_price: number
  amount: number
}

export interface Invoice {
  id: number
  invoice_number: string
  status: "issued" | "paid" | "void" | "refunded"
  kind: "booking" | "order" | "gift_card" | "manual"
  source_label: string
  subtotal: string
  tax: string
  total: string
  tax_rate: string
  currency: string
  payment_method: string | null
  line_items: InvoiceLineItem[]
  notes: string | null
  issued_at: string | null
  paid_at: string | null
  created_at: string
  has_pdf: boolean
  customer: { id: number; name: string; email: string }
}

interface Paged<T> {
  data: T[]
  pagination: { current_page: number; total_pages: number; next_page: number | null }
}

export function useInvoices(page = 1, kind?: string) {
  return useQuery({
    queryKey: ["invoices", page, kind],
    queryFn: () =>
      api.get<Paged<Invoice>>("/invoices", { params: { page, kind: kind || undefined } }).then((r) => r.data),
  })
}

// Authenticated PDF download (sends JWT via axios, then triggers a browser save).
// scope "admin" hits the admin endpoint; otherwise the customer's own.
export async function downloadInvoice(id: number, invoiceNumber: string, scope: "customer" | "admin" = "customer") {
  const path = scope === "admin" ? `/admin/invoices/${id}/download` : `/invoices/${id}/download`
  const res = await api.get(path, { responseType: "blob" })
  const url = URL.createObjectURL(res.data as Blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${invoiceNumber}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}
