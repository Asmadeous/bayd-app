"use client"

import Link from "next/link"
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { ChevronRight, Search } from "lucide-react"

import { StatusBadge } from "@/components/dashboard/status-badge"
import api from "@/lib/api"
import { formatBookingDate } from "@/lib/booking-time"
import { AdminHeader } from "../admin-header"
import { adminScreenClass, cardClass, mutedClass } from "../admin-theme"
import { EmptyCard, FilterChips, Pager } from "../ui"
import { ROLES, userName, type AdminUser } from "./types"

type Paged = { data: AdminUser[]; pagination: { current_page: number; total_pages: number; next_page: number | null; total_count: number } }
const FILTERS = ["", ...ROLES] as const

// The web Customers page: accounts by email search and role (customers by
// default). Each opens its account screen (role, message, delete).
export default function AdminUsersScreen() {
  const [page, setPage] = useState(1)
  const [role, setRole] = useState<(typeof FILTERS)[number]>("customer")
  const [q, setQ] = useState("")
  const { data, isLoading } = useQuery<Paged>({
    queryKey: ["admin-users", page, role, q],
    queryFn: () => api.get<Paged>("/admin/users", { params: { page, role: role || undefined, q: q || undefined } }).then((r) => r.data),
  })
  const users = data?.data ?? []
  const total = data?.pagination?.total_count ?? "-"

  return (
    <div className={adminScreenClass}>
      <AdminHeader title="Customers" />
      <p className={`px-5 pb-3 text-sm ${mutedClass}`}>
        {role ? `${total} registered ${role}s.` : `${total} registered users across customer, employee, and admin roles.`}
      </p>
      <div className="space-y-3 px-5">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#14100F]/40" aria-hidden />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1) }}
            placeholder="Search by email"
            className="h-11 w-full rounded-xl border border-black/10 bg-white pl-9 pr-3 text-base outline-none focus:border-[#C96C83]"
          />
        </label>
        <FilterChips options={FILTERS} value={role} onChange={(r) => { setRole(r); setPage(1) }} label={(r) => r || "All roles"} />

        {isLoading ? (
          <p className={`text-sm ${mutedClass}`}>Loading users…</p>
        ) : users.length === 0 ? (
          <EmptyCard title="No users found" body="Adjust the search or role filter to find another account." />
        ) : (
          users.map((u) => (
            <Link key={u.id} href={`/admin/users/view?id=${u.id}`} className={`${cardClass} flex items-center gap-3 p-4`}>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-bold">{userName(u)}</span>
                  <StatusBadge tone={u.role === "admin" ? "dark" : u.role === "employee" ? "rose" : "gray"}>{u.role}</StatusBadge>
                </div>
                <p className={`mt-1 truncate text-sm ${mutedClass}`}>{u.email}</p>
                <p className={`mt-0.5 text-xs ${mutedClass}`}>Joined {formatBookingDate(u.created_at, { month: "short", day: "numeric", year: "numeric" })}</p>
              </div>
              <ChevronRight className="size-5 shrink-0 text-[#14100F]/30" aria-hidden />
            </Link>
          ))
        )}
        <Pager page={page} totalPages={data?.pagination?.total_pages} hasNext={!!data?.pagination?.next_page} onPage={setPage} />
      </div>
    </div>
  )
}
