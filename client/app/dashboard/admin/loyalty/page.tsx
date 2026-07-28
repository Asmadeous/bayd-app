"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import api from "@/lib/api"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { StatCard } from "@/components/dashboard/stat-card"
import { Button } from "@/components/ui/button"

interface LoyaltyAccount { id: number; points_balance: number; created_at: string; user: { email: string; first_name: string | null; last_name: string | null } }
interface PagedResponse<T> { data: T[]; pagination: { current_page: number; total_pages: number; next_page: number | null; total_count: number } }

export default function AdminLoyaltyPage() {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useQuery<PagedResponse<LoyaltyAccount>>({
    queryKey: ["admin-loyalty", page],
    queryFn: () => api.get<PagedResponse<LoyaltyAccount>>("/admin/loyalty", { params: { page } }).then((r) => r.data),
  })

  const accounts = data?.data ?? []
  const totalPoints = accounts.reduce((s, a) => s + a.points_balance, 0)

  return (
    <div className="space-y-6">
      <DashboardHeader title="Loyalty Program" subtitle="Customer points balances" />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard label="Total Accounts" value={data?.pagination?.total_count ?? "—"} />
        <StatCard label="Points Outstanding" value={totalPoints.toLocaleString()} accent />
      </div>

      {isLoading ? <div className="text-sm text-[#5f6268]">Loading…</div> : accounts.length === 0 ? (
        <div className="rounded-xl border border-black/8 bg-white px-5 py-12 text-center text-sm text-[#5f6268]">No loyalty accounts yet.</div>
      ) : (
        <div className="rounded-xl border border-black/8 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/6 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-[#5f6268] uppercase tracking-wide">Customer</th>
                <th className="px-4 py-3 text-xs font-semibold text-[#5f6268] uppercase tracking-wide">Email</th>
                <th className="px-4 py-3 text-xs font-semibold text-[#5f6268] uppercase tracking-wide">Points Balance</th>
                <th className="px-4 py-3 text-xs font-semibold text-[#5f6268] uppercase tracking-wide">Member Since</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => {
                const name = [a.user?.first_name, a.user?.last_name].filter(Boolean).join(" ") || "—"
                return (
                  <tr key={a.id} className="border-b border-black/4 last:border-0">
                    <td className="px-4 py-3 font-medium text-[#101217]">{name}</td>
                    <td className="px-4 py-3 text-[#5f6268]">{a.user?.email}</td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-[#c96c83]">{a.points_balance.toLocaleString()} pts</span>
                    </td>
                    <td className="px-4 py-3 text-[#5f6268] text-xs">{new Date(a.created_at).toLocaleDateString("en-CA")}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
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
