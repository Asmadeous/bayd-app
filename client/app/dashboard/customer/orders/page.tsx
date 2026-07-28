"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import api from "@/lib/api"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Button } from "@/components/ui/button"

interface Order {
  id: number
  status: string
  subtotal: string
  shipping_fee: string
  total: string
  created_at: string
  order_items: { id: number; quantity: number; unit_price: string; product: { name: string } }[]
}

interface PagedResponse<T> {
  data: T[]
  pagination: { current_page: number; per_page: number; total_count: number; total_pages: number; next_page: number | null }
}

export default function CustomerOrdersPage() {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useQuery<PagedResponse<Order>>({
    queryKey: ["orders", page],
    queryFn: () => api.get<PagedResponse<Order>>("/orders", { params: { page } }).then((r) => r.data),
  })

  const orders = data?.data ?? []
  const pagination = data?.pagination

  return (
    <div className="space-y-6">
      <DashboardHeader title="My Orders" subtitle="Product orders from the BAYD shop" />

      {isLoading ? (
        <div className="text-sm text-[#5f6268]">Loading…</div>
      ) : orders.length === 0 ? (
        <div className="rounded-xl border border-black/8 bg-white px-5 py-12 text-center text-sm text-[#5f6268]">
          No orders yet.
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div key={order.id} className="rounded-xl border border-black/8 bg-white px-5 py-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className="font-semibold text-sm text-[#101217]">Order #{order.id}</span>
                  <span className="ml-2 text-xs px-2 py-0.5 rounded-full font-medium capitalize" style={{ background: "#f4f1eb", color: "#5f6268" }}>
                    {order.status}
                  </span>
                </div>
                <span className="font-bold text-[#101217]">${order.total}</span>
              </div>
              <p className="text-xs text-[#5f6268] mt-1">
                {new Date(order.created_at).toLocaleDateString("en-CA")}
                {" · "}
                {order.order_items?.map((i) => `${i.quantity}× ${i.product?.name}`).join(", ")}
              </p>
            </div>
          ))}
        </div>
      )}

      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center gap-3 justify-end">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
          <span className="text-sm text-[#5f6268]">{page} / {pagination.total_pages}</span>
          <Button variant="outline" size="sm" disabled={!pagination.next_page} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  )
}
