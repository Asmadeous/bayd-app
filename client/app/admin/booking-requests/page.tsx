"use client"

import Link from "next/link"
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { ChevronRight } from "lucide-react"

import { StatusBadge, StatusBadgeFor } from "@/components/dashboard/status-badge"
import api from "@/lib/api"
import { formatBookingDate } from "@/lib/booking-time"
import { cn } from "@/lib/utils"
import { AdminHeader } from "../admin-header"
import { adminScreenClass, cardClass, mutedClass } from "../admin-theme"
import { STATUSES, formatAddress, formatStatus, formatWhen, personName, type BookingRequest, type BookingRequestStatus } from "./types"

type Paged = { data: BookingRequest[]; pagination: { current_page: number; total_pages: number; next_page: number | null } }

// The web Booking Requests page: incoming requests and how assignment went,
// filtered by status. Each opens its assignment details.
export default function AdminBookingRequestsScreen() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<BookingRequestStatus | "">("")
  const { data, isLoading, isError } = useQuery<Paged>({
    queryKey: ["admin-booking-requests", page, status],
    queryFn: () => api.get<Paged>("/admin/booking_requests", { params: { page, status: status || undefined } }).then((r) => r.data),
  })
  const requests = data?.data ?? []

  return (
    <div className={adminScreenClass}>
      <AdminHeader title="Booking Requests" />
      <p className={`px-5 pb-3 text-sm ${mutedClass}`}>Review incoming service requests and assignment outcomes.</p>
      <div className="space-y-3 px-5">
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
          {(["", ...STATUSES] as const).map((s) => (
            <button
              key={s || "all"}
              type="button"
              onClick={() => { setStatus(s); setPage(1) }}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-2 text-sm font-bold capitalize",
                status === s ? "bg-[#14100F] text-white" : "bg-white text-[#14100F]/70 shadow-sm",
              )}
            >
              {formatStatus(s) || "All"}
            </button>
          ))}
        </div>
        <p className={`text-sm font-semibold ${mutedClass}`}>{requests.length} visible requests</p>

        {isLoading ? (
          <p className={`text-sm ${mutedClass}`}>Loading booking requests…</p>
        ) : isError ? (
          <p className="text-sm font-semibold text-[#8f3f4b]">Could not load booking requests. Try again in a moment.</p>
        ) : requests.length === 0 ? (
          <div className={`${cardClass} p-5`}>
            <p className="text-base font-bold">No requests found</p>
            <p className={`mt-1 text-sm ${mutedClass}`}>Try another status filter or check back when new booking requests arrive.</p>
          </div>
        ) : (
          requests.map((r) => (
            <Link key={r.id} href={`/admin/booking-requests/view?id=${r.id}`} className={`${cardClass} flex items-center gap-3 p-4`}>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-bold">{r.service?.name}</span>
                  <StatusBadgeFor status={r.status} />
                  <StatusBadge>{formatStatus(r.kind)}</StatusBadge>
                </div>
                <p className={`mt-1.5 text-sm ${mutedClass}`}>
                  {personName(r.user)} · {formatAddress(r.address)}
                  {r.requested_start ? ` · ${formatWhen(r.requested_start)}` : ""}
                </p>
                {r.assigned_employee ? (
                  <p className={`mt-1 text-xs font-semibold ${mutedClass}`}>Assigned to {personName(r.assigned_employee.user) || "technician"}</p>
                ) : null}
                <p className={`mt-1 text-xs ${mutedClass}`}>
                  Received {formatBookingDate(r.created_at, { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>
              <ChevronRight className="size-5 shrink-0 text-[#14100F]/30" aria-hidden />
            </Link>
          ))
        )}

        {data?.pagination && data.pagination.total_pages > 1 ? (
          <div className="flex items-center justify-between pt-1">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold shadow-sm disabled:opacity-40">
              Prev
            </button>
            <span className={`text-sm ${mutedClass}`}>
              {page} / {data.pagination.total_pages}
            </span>
            <button type="button" disabled={!data.pagination.next_page} onClick={() => setPage((p) => p + 1)} className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold shadow-sm disabled:opacity-40">
              Next
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
