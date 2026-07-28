"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Button } from "@/components/ui/button"

interface User {
  id: number
  email: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  role: string
  marketing_opt_in: boolean
  created_at: string
}

interface PagedResponse<T> { data: T[]; pagination: { current_page: number; total_pages: number; next_page: number | null; total_count: number } }

const ROLES = ["customer", "employee", "admin"]

export default function AdminUsersPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [roleFilter, setRoleFilter] = useState("")
  const [q, setQ] = useState("")
  const [editId, setEditId] = useState<number | null>(null)
  const [editRole, setEditRole] = useState("")

  const { data, isLoading } = useQuery<PagedResponse<User>>({
    queryKey: ["admin-users", page, roleFilter, q],
    queryFn: () => api.get<PagedResponse<User>>("/admin/users", { params: { page, role: roleFilter || undefined, q: q || undefined } }).then((r) => r.data),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, role }: { id: number; role: string }) => api.patch(`/admin/users/${id}`, { role }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); setEditId(null) },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  })

  const users = data?.data ?? []
  const pagination = data?.pagination

  return (
    <div className="space-y-6">
      <DashboardHeader title="Customers" subtitle={`${pagination?.total_count ?? "—"} registered users`} />

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1) }}
          placeholder="Search by email…"
          className="h-9 border border-black/15 rounded-lg px-3 text-sm focus:outline-none focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20 w-56"
        />
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1) }}
          className="h-9 border border-black/15 rounded-lg px-3 text-sm focus:outline-none focus:border-[#c96c83]"
        >
          <option value="">All roles</option>
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="text-sm text-[#5f6268]">Loading…</div>
      ) : users.length === 0 ? (
        <div className="rounded-xl border border-black/8 bg-white px-5 py-12 text-center text-sm text-[#5f6268]">No users found.</div>
      ) : (
        <div className="rounded-xl border border-black/8 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/6 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-[#5f6268] uppercase tracking-wide">Name</th>
                <th className="px-4 py-3 text-xs font-semibold text-[#5f6268] uppercase tracking-wide">Email</th>
                <th className="px-4 py-3 text-xs font-semibold text-[#5f6268] uppercase tracking-wide">Role</th>
                <th className="px-4 py-3 text-xs font-semibold text-[#5f6268] uppercase tracking-wide">Joined</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-black/4 last:border-0">
                  <td className="px-4 py-3 font-medium text-[#101217]">
                    {[u.first_name, u.last_name].filter(Boolean).join(" ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-[#5f6268]">{u.email}</td>
                  <td className="px-4 py-3">
                    {editId === u.id ? (
                      <div className="flex gap-2 items-center">
                        <select
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value)}
                          className="h-7 border border-black/15 rounded px-2 text-xs"
                        >
                          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <Button size="xs" onClick={() => updateMutation.mutate({ id: u.id, role: editRole })} style={{ background: "#c96c83", border: "none", color: "#fff" }}>Save</Button>
                        <Button size="xs" variant="ghost" onClick={() => setEditId(null)}>✕</Button>
                      </div>
                    ) : (
                      <span className="capitalize text-[#5f6268]">{u.role}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[#5f6268] text-xs">{new Date(u.created_at).toLocaleDateString("en-CA")}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <Button size="xs" variant="outline" onClick={() => { setEditId(u.id); setEditRole(u.role) }}>Edit Role</Button>
                      <Button size="xs" variant="destructive" disabled={deleteMutation.isPending} onClick={() => { if (confirm("Delete this user?")) deleteMutation.mutate(u.id) }}>Delete</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
