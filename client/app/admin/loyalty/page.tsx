"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"

import api from "@/lib/api"
import { formatBookingDate } from "@/lib/booking-time"
import { cn } from "@/lib/utils"
import { AdminHeader } from "../admin-header"
import { adminScreenClass, cardClass, mutedClass } from "../admin-theme"
import { EmptyCard, Pager } from "../ui"

interface LoyaltyAccount {
  id: number
  points_balance: number
  created_at: string
  user: { email: string; first_name: string | null; last_name: string | null }
}

type Paged = { data: LoyaltyAccount[]; pagination: { current_page: number; total_pages: number; next_page: number | null; total_count: number } }

// The web Loyalty page: customers' points balances.
export default function AdminLoyaltyScreen() {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useQuery<Paged>({
    queryKey: ["admin-loyalty", page],
    queryFn: () => api.get<Paged>("/admin/loyalty", { params: { page } }).then((r) => r.data),
  })
  const accounts = data?.data ?? []
  const totalPoints = accounts.reduce((sum, a) => sum + a.points_balance, 0)

  return (
    <div className={adminScreenClass}>
      <AdminHeader title="Loyalty" />
      <p className={`px-5 pb-3 text-sm ${mutedClass}`}>Review customer points balances.</p>
      <div className="space-y-3 px-5">
        <div className="grid grid-cols-2 gap-3">
          <div className={`${cardClass} p-4`}>
            <p className={`text-xs font-bold uppercase tracking-wide ${mutedClass}`}>Total accounts</p>
            <p className="mt-1 text-2xl font-black">{data?.pagination?.total_count ?? "-"}</p>
          </div>
          <div className={cn(cardClass, "bg-[#14100F] p-4 text-white")}>
            <p className="text-xs font-bold uppercase tracking-wide text-white/70">Points outstanding</p>
            <p className="mt-1 text-2xl font-black">{totalPoints.toLocaleString()}</p>
          </div>
        </div>
        {isLoading ? (
          <p className={`text-sm ${mutedClass}`}>Loading loyalty accounts…</p>
        ) : accounts.length === 0 ? (
          <EmptyCard title="No loyalty accounts yet" body="Customer loyalty accounts will appear here." />
        ) : (
          accounts.map((a) => (
            <section key={a.id} className={`${cardClass} flex items-center justify-between gap-3 p-4`}>
              <div className="min-w-0">
                <p className="truncate text-base font-bold">{[a.user?.first_name, a.user?.last_name].filter(Boolean).join(" ") || "-"}</p>
                <p className={`truncate text-sm ${mutedClass}`}>{a.user?.email}</p>
                <p className={`text-xs ${mutedClass}`}>Member since {formatBookingDate(a.created_at, { month: "short", day: "numeric", year: "numeric" })}</p>
              </div>
              <span className="shrink-0 text-lg font-black text-[#C96C83]">{a.points_balance.toLocaleString()} pts</span>
            </section>
          ))
        )}
        <Pager page={page} totalPages={data?.pagination?.total_pages} hasNext={!!data?.pagination?.next_page} onPage={setPage} />
      </div>
    </div>
  )
}
