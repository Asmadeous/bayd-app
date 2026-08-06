"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ShoppingBag } from "lucide-react"

import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardPage } from "@/components/dashboard/dashboard-page"
import { DashboardPanel } from "@/components/dashboard/dashboard-panel"
import {
  DashboardToolbar,
  SegmentedControl,
  SegmentButton,
  ToolbarSection,
} from "@/components/dashboard/dashboard-toolbar"
import { EmptyState } from "@/components/dashboard/empty-state"
import { StatusBadgeFor } from "@/components/dashboard/status-badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import api from "@/lib/api"

interface Order {
  id: number
  status: string
  subtotal: string
  shipping_fee: string
  total: string
  created_at: string
  user: { email: string; first_name: string | null; last_name: string | null }
  order_items: { quantity: number; unit_price: string; product: { name: string } }[]
}

interface PagedResponse<T> {
  data: T[]
  pagination: { current_page: number; total_pages: number; next_page: number | null }
}

const ORDER_STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"]

export default function AdminOrdersPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState("")

  const { data, isLoading } = useQuery<PagedResponse<Order>>({
    queryKey: ["admin-orders", page, status],
    queryFn: () =>
      api
        .get<PagedResponse<Order>>("/admin/orders", {
          params: { page, status: status || undefined },
        })
        .then((response) => response.data),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.patch(`/admin/orders/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-orders"] }),
  })

  const orders = data?.data ?? []

  function selectStatus(nextStatus: string) {
    setStatus(nextStatus)
    setPage(1)
  }

  return (
    <DashboardPage maxWidth="wide">
      <DashboardHeader title="Orders" subtitle="Review shop orders and update fulfillment status." />

      <DashboardToolbar>
        <ToolbarSection>
          <SegmentedControl>
            {["", ...ORDER_STATUSES].map((orderStatus) => (
              <SegmentButton
                active={status === orderStatus}
                key={orderStatus || "all"}
                onClick={() => selectStatus(orderStatus)}
              >
                {orderStatus || "All"}
              </SegmentButton>
            ))}
          </SegmentedControl>
        </ToolbarSection>
        <ToolbarSection className="text-sm font-semibold text-[#5f6268]">
          {orders.length} visible orders
        </ToolbarSection>
      </DashboardToolbar>

      {isLoading ? (
        <DashboardPanel>
          <p className="text-sm text-[#5f6268]">Loading orders...</p>
        </DashboardPanel>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="No orders found"
          description="Try another status filter or check back when new shop orders come in."
        />
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const name =
              [order.user?.first_name, order.user?.last_name].filter(Boolean).join(" ") ||
              order.user?.email

            return (
              <DashboardPanel className="p-0" key={order.id}>
                <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-extrabold text-[#101217]">Order #{order.id}</h2>
                      <StatusBadgeFor status={order.status} />
                    </div>
                    <p className="mt-2 text-xs leading-5 text-[#5f6268]">
                      {name} / {new Date(order.created_at).toLocaleDateString("en-CA")}
                    </p>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5f6268]">
                      {order.order_items
                        ?.map((item) => `${item.quantity}x ${item.product?.name}`)
                        .join(", ")}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-3 lg:justify-end">
                    <span className="font-heading text-2xl font-extrabold text-[#101217]">
                      ${order.total}
                    </span>
                    <Select
                      disabled={updateMutation.isPending}
                      onValueChange={(value) =>
                        updateMutation.mutate({ id: order.id, status: value ?? order.status })
                      }
                      value={order.status}
                    >
                      <SelectTrigger className="h-9 w-36 text-xs capitalize">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ORDER_STATUSES.map((orderStatus) => (
                          <SelectItem className="capitalize" key={orderStatus} value={orderStatus}>
                            {orderStatus}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </DashboardPanel>
            )
          })}
        </div>
      )}

      {data?.pagination && data.pagination.total_pages > 1 ? (
        <DashboardToolbar className="justify-end">
          <ToolbarSection className="ml-auto">
            <Button
              disabled={page <= 1}
              onClick={() => setPage((currentPage) => currentPage - 1)}
              size="sm"
              variant="outline"
            >
              Prev
            </Button>
            <span className="px-2 text-sm font-semibold text-[#5f6268]">
              {page} / {data.pagination.total_pages}
            </span>
            <Button
              disabled={!data.pagination.next_page}
              onClick={() => setPage((currentPage) => currentPage + 1)}
              size="sm"
              variant="outline"
            >
              Next
            </Button>
          </ToolbarSection>
        </DashboardToolbar>
      ) : null}
    </DashboardPage>
  )
}
