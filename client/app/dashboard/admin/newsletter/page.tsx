"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { StatCard } from "@/components/dashboard/stat-card"
import { Button } from "@/components/ui/button"

interface Subscriber { id: number; email: string; confirmed: boolean; created_at: string }
interface PagedResponse<T> { data: T[]; pagination: { current_page: number; total_pages: number; next_page: number | null; total_count: number } }

export default function AdminNewsletterPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery<PagedResponse<Subscriber>>({
    queryKey: ["admin-newsletter", page],
    queryFn: () => api.get<PagedResponse<Subscriber>>("/admin/newsletter_subscribers", { params: { page } }).then((r) => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/newsletter_subscribers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-newsletter"] }),
  })

  const subscribers = data?.data ?? []

  return (
    <div className="space-y-6">
      <DashboardHeader title="Newsletter" subtitle="Manage newsletter subscribers" />

      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Total Subscribers" value={data?.pagination?.total_count ?? "—"} accent />
      </div>

      {isLoading ? <div className="text-sm text-[#5f6268]">Loading…</div> : subscribers.length === 0 ? (
        <div className="rounded-xl border border-black/8 bg-white px-5 py-12 text-center text-sm text-[#5f6268]">No subscribers yet.</div>
      ) : (
        <div className="rounded-xl border border-black/8 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/6 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-[#5f6268] uppercase tracking-wide">Email</th>
                <th className="px-4 py-3 text-xs font-semibold text-[#5f6268] uppercase tracking-wide">Confirmed</th>
                <th className="px-4 py-3 text-xs font-semibold text-[#5f6268] uppercase tracking-wide">Subscribed</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {subscribers.map((s) => (
                <tr key={s.id} className="border-b border-black/4 last:border-0">
                  <td className="px-4 py-3 text-[#101217]">{s.email}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={s.confirmed ? { background: "#5a9e5a22", color: "#5a9e5a" } : { background: "#d4a84322", color: "#d4a843" }}>
                      {s.confirmed ? "Yes" : "Pending"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#5f6268] text-xs">{new Date(s.created_at).toLocaleDateString("en-CA")}</td>
                  <td className="px-4 py-3">
                    <Button size="xs" variant="destructive" disabled={deleteMutation.isPending} onClick={() => { if (confirm("Unsubscribe this email?")) deleteMutation.mutate(s.id) }}>Remove</Button>
                  </td>
                </tr>
              ))}
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
