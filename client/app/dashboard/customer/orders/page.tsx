"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { ShoppingBag } from "lucide-react"

import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardPage } from "@/components/dashboard/dashboard-page"
import { DashboardPanel } from "@/components/dashboard/dashboard-panel"
import { DashboardToolbar, ToolbarSection } from "@/components/dashboard/dashboard-toolbar"
import { EmptyState } from "@/components/dashboard/empty-state"
import { StatusBadgeFor } from "@/components/dashboard/status-badge"
import { TutorialButton } from "@/components/dashboard/tutorial-button"
import { Button } from "@/components/ui/button"
import api from "@/lib/api"
import { customerOrdersSteps } from "@/lib/tours/customer-orders-tour"

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
  pagination: {
    current_page: number
    per_page: number
    total_count: number
    total_pages: number
    next_page: number | null
  }
}

export default function CustomerOrdersPage() {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useQuery<PagedResponse<Order>>({
    queryKey: ["orders", page],
    queryFn: () =>
      api.get<PagedResponse<Order>>("/orders", { params: { page } }).then((response) => response.data),
  })

  const orders = data?.data ?? []
  const pagination = data?.pagination

  return (
    <DashboardPage maxWidth="wide">
      <div data-tour="customer-orders-header">
        <DashboardHeader title="Orders" subtitle="Track product orders from the B.A.Y.D shop." />
      </div>

      {isLoading ? (
        <DashboardPanel>
          <p className="text-sm text-[#5f6268]">Loading orders...</p>
        </DashboardPanel>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="No orders yet"
          description="Product orders from the shop will appear here."
        />
      ) : (
        <div className="space-y-3" data-tour="customer-orders-list">
          {orders.map((order) => (
            <DashboardPanel className="p-0" key={order.id}>
              <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-extrabold text-[#101217]">Order #{order.id}</h2>
                    <StatusBadgeFor status={order.status} />
                  </div>
                  <p className="mt-2 text-xs font-semibold text-[#5f6268]">
                    {new Date(order.created_at).toLocaleDateString("en-CA")}
                  </p>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5f6268]">
                    {order.order_items
                      ?.map((item) => `${item.quantity}x ${item.product?.name}`)
                      .join(", ")}
                  </p>
                </div>
                <span className="font-heading text-2xl font-extrabold text-[#101217]">
                  ${order.total}
                </span>
              </div>
            </DashboardPanel>
          ))}
        </div>
      )}

      {pagination && pagination.total_pages > 1 ? (
        <DashboardToolbar className="justify-end" data-tour="customer-orders-pagination">
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
              {page} / {pagination.total_pages}
            </span>
            <Button
              disabled={!pagination.next_page}
              onClick={() => setPage((currentPage) => currentPage + 1)}
              size="sm"
              variant="outline"
            >
              Next
            </Button>
          </ToolbarSection>
        </DashboardToolbar>
      ) : null}

      <TutorialButton steps={customerOrdersSteps} pageKey="customer-orders" />
    </DashboardPage>
  )
}
