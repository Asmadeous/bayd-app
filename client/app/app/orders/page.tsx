"use client"


import api from "@/lib/api"
import { LoadMore } from "@/components/load-more"
import { usePagedList } from "@/lib/hooks/use-paged-list"
import { appScreenClass, cardClass, mutedClass } from "../app-theme"
import { ShoppingBag } from "lucide-react"
import { EmptyState } from "../empty-state"
import { AppHeader } from "../app-header"
import { formatMoney } from "@/lib/stores/franchise-store"

interface Order {
  id: number
  status: string
  total: string
  created_at: string
  // Matches OrderItemSerializer: flat name + price, no nested product object.
  order_items: { id: number; quantity: number; price: string; name: string }[]
}

interface Paged<T> {
  data: T[]
  pagination: { current_page: number; total_pages: number; next_page: number | null }
}

export function OrdersList() {
  const { items: orders, isLoading, hasMore, loadingMore, loadMore } = usePagedList<Order>(["orders", "list"], (page) =>
    api.get<Paged<Order>>("/orders", { params: { page } }).then((r) => r.data),
  )

  return (
    <>
      {isLoading ? (
        <ListSkeleton />
      ) : orders.length === 0 ? (
        <EmptyState icon={ShoppingBag} title="No orders yet" text="Products you order are tracked here from payment to delivery." action={{ label: "Browse the shop", href: "/app/shop" }} />
      ) : (
        <>
          <ul className="space-y-3 pb-6">
          {orders.map((o) => {
            const when = new Date(o.created_at)
            return (
              <li key={o.id} className={`p-4 ${cardClass}`}>
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-[#c96c83]/12 px-2.5 py-1 text-[0.8125rem] font-bold uppercase tracking-[0.1em] text-[#c96c83]">
                    {o.status}
                  </span>
                  <span className="text-sm font-extrabold">{formatMoney(Number(o.total))}</span>
                </div>
                <p className={`mt-2 text-sm ${mutedClass}`}>
                  {when.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} · Order #{o.id}
                </p>
                <ul className="mt-2 space-y-0.5 text-sm">
                  {o.order_items.map((it) => (
                    <li key={it.id} className="flex justify-between">
                      <span className="truncate">{it.quantity}× {it.name}</span>
                      <span className={mutedClass}>{formatMoney(Number(it.price))}</span>
                    </li>
                  ))}
                </ul>
              </li>
            )
          })}
          </ul>
          <LoadMore className="mb-6" hasMore={hasMore} loading={loadingMore} onLoad={loadMore} />
        </>
      )}
    </>
  )
}

export default function AppOrdersScreen() {
  return (
    <div className={appScreenClass}>
      <AppHeader back title="Orders" />
      <div className="px-5">
        <OrdersList />
      </div>
    </div>
  )
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-24 animate-pulse rounded-3xl bg-black/[0.04]" />
      ))}
    </div>
  )
}

