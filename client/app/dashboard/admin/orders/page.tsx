"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Button } from "@/components/ui/button"

interface Order { id: number; status: string; subtotal: string; shipping_fee: string; total: string; created_at: string; user: { email: string; first_name: string | null; last_name: string | null }; order_items: { quantity: number; unit_price: string; product: { name: string } }[] }
interface PagedResponse<T> { data: T[]; pagination: { current_page: number; total_pages: number; next_page: number | null } }

const ORDER_STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"]

export default function AdminOrdersPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState("")

  const { data, isLoading } = useQuery<PagedResponse<Order>>({
    queryKey: ["admin-orders", page, status],
    queryFn: () => api.get<PagedResponse<Order>>("/admin/orders", { params: { page, status: status || undefined } }).then((r) => r.data),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => api.patch(`/admin/orders/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-orders"] }),
  })

  const orders = data?.data ?? []

  return (
    <div className="space-y-6">
      <DashboardHeader title="Orders" subtitle="All shop orders" />

      <div className="flex gap-2 flex-wrap">
        {["", ...ORDER_STATUSES].map((s) => (
          <button key={s} onClick={() => setStatus(s)} className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors capitalize"
            style={status === s ? { background: "#c96c83", color: "#fff" } : { background: "white", color: "#5f6268", border: "1px solid #e5e5e5" }}>
            {s || "All"}
          </button>
        ))}
      </div>

      {isLoading ? <div className="text-sm text-[#5f6268]">Loading…</div> : orders.length === 0 ? (
        <div className="rounded-xl border border-black/8 bg-white px-5 py-12 text-center text-sm text-[#5f6268]">No orders found.</div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => {
            const name = [o.user?.first_name, o.user?.last_name].filter(Boolean).join(" ") || o.user?.email
            return (
              <div key={o.id} className="rounded-xl border border-black/8 bg-white px-5 py-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-[#101217]">Order #{o.id}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium capitalize" style={{ background: "#f4f1eb", color: "#5f6268" }}>{o.status}</span>
                    </div>
                    <p className="text-xs text-[#5f6268] mt-0.5">{name} · {new Date(o.created_at).toLocaleDateString("en-CA")}</p>
                    <p className="text-xs text-[#5f6268] mt-0.5">{o.order_items?.map((i) => `${i.quantity}× ${i.product?.name}`).join(", ")}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-bold text-[#101217]">${o.total}</span>
                    <select
                      defaultValue={o.status}
                      onChange={(e) => updateMutation.mutate({ id: o.id, status: e.target.value })}
                      className="h-7 border border-black/15 rounded px-2 text-xs focus:outline-none focus:border-[#c96c83]"
                    >
                      {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {data?.pagination && data.pagination.total_pages > 1 && (
        <div className="flex items-center gap-3 justify-end">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
          <span className="text-sm text-[#5f6268]">{page} / {data.pagination.total_pages}</span>
          <Button variant="outline" size="sm" disabled={!data.pagination.next_page} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  )
}
