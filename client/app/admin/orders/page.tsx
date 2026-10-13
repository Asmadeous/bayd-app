"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { StatusBadgeFor } from "@/components/dashboard/status-badge"
import api from "@/lib/api"
import { useToast } from "@/lib/app-ui/app-ui-provider"
import { formatBookingDate } from "@/lib/booking-time"
import { formatMoney } from "@/lib/stores/franchise-store"
import { AdminHeader } from "../admin-header"
import { adminScreenClass, cardClass, mutedClass } from "../admin-theme"
import { apiError, EmptyCard, FilterChips, Pager } from "../ui"

interface Order {
  id: number
  status: string
  subtotal: string
  shipping_fee: string
  total: string
  created_at: string
  user: { email: string; first_name: string | null; last_name: string | null }
  order_items: { quantity: number; price: string; name: string }[]
}

type Paged = { data: Order[]; pagination: { current_page: number; total_pages: number; next_page: number | null } }

const ORDER_STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"] as const
const FILTERS = ["", ...ORDER_STATUSES] as const

// The web Orders page: shop orders by status, each with its items, total and
// fulfillment status.
export default function AdminOrdersScreen() {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<(typeof FILTERS)[number]>("")
  const { data, isLoading } = useQuery<Paged>({
    queryKey: ["admin-orders", page, status],
    queryFn: () => api.get<Paged>("/admin/orders", { params: { page, status: status || undefined } }).then((r) => r.data),
  })
  const update = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => api.patch(`/admin/orders/${id}`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-orders"] })
      toast({ title: "Order status saved", variant: "success" })
    },
    onError: (e) => toast({ title: "Order status not saved", description: apiError(e, "Could not update this order."), variant: "error" }),
  })
  const orders = data?.data ?? []

  return (
    <div className={adminScreenClass}>
      <AdminHeader title="Orders" />
      <p className={`px-5 pb-3 text-sm ${mutedClass}`}>Review shop orders and update fulfillment status.</p>
      <div className="space-y-3 px-5">
        <FilterChips
          options={FILTERS}
          value={status}
          onChange={(s) => {
            setStatus(s)
            setPage(1)
          }}
        />
        {isLoading ? (
          <p className={`text-sm ${mutedClass}`}>Loading orders…</p>
        ) : orders.length === 0 ? (
          <EmptyCard title="No orders found" body="Try another status filter or check back when new shop orders come in." />
        ) : (
          orders.map((o) => {
            const name = [o.user?.first_name, o.user?.last_name].filter(Boolean).join(" ") || o.user?.email
            return (
              <section key={o.id} className={`${cardClass} space-y-2 p-4`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-base font-bold">Order #{o.id}</span>
                  <StatusBadgeFor status={o.status} />
                </div>
                <p className={`text-sm ${mutedClass}`}>
                  {name} · {formatBookingDate(o.created_at, { month: "short", day: "numeric", year: "numeric" })}
                </p>
                <p className="text-sm">{o.order_items?.map((i) => `${i.quantity}x ${i.name}`).join(", ")}</p>
                <div className="flex items-center gap-3 pt-1">
                  <span className="text-xl font-black">{formatMoney(Number(o.total))}</span>
                  <select
                    aria-label="Order status"
                    disabled={update.isPending}
                    value={o.status}
                    onChange={(e) => update.mutate({ id: o.id, status: e.target.value })}
                    className="h-10 flex-1 rounded-xl border border-black/10 bg-white px-3 text-sm font-semibold capitalize outline-none focus:border-[#C96C83]"
                  >
                    {ORDER_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </section>
            )
          })
        )}
        <Pager page={page} totalPages={data?.pagination?.total_pages} hasNext={!!data?.pagination?.next_page} onPage={setPage} />
      </div>
    </div>
  )
}
