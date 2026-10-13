"use client"

import Link from "next/link"
import { useState } from "react"
import { Plus } from "lucide-react"

import { ViewSwitch, type BookingView } from "@/components/calendar/view-switch"
import { useAdminBookings } from "@/lib/hooks/use-admin"
import type { Booking } from "@/lib/hooks/use-bookings"
import { cn } from "@/lib/utils"
import { AdminCalendar } from "../admin-calendar"
import { AdminHeader } from "../admin-header"
import { adminScreenClass, cardClass, mutedClass } from "../admin-theme"
import { BookingRow } from "../booking-row"

// The web Bookings page's statuses, in the same order.
const STATUSES: Array<Booking["status"] | "all"> = ["all", "pending", "confirmed", "in_progress", "completed", "cancelled", "no_show", "missed"]

// Company bookings by list (filtered by status, paged like the web) or by
// calendar, with New booking up top.
export default function AdminBookingsScreen() {
  const [view, setView] = useState<BookingView>("list")
  const [filter, setFilter] = useState<Booking["status"] | "all">("all")
  const [page, setPage] = useState(1)
  const { data, isLoading } = useAdminBookings({ status: view === "list" && filter !== "all" ? filter : undefined, page })
  const bookings = data?.data ?? []
  const pagination = data?.pagination

  return (
    <div className={adminScreenClass}>
      <AdminHeader
        title="Bookings"
        action={
          <Link href="/admin/bookings/new" className="flex h-10 items-center gap-1 rounded-full bg-[#C96C83] px-4 text-sm font-bold text-white">
            <Plus className="size-4" aria-hidden /> New
          </Link>
        }
      />
      <div className="space-y-3 px-5">
        <div className="flex items-center justify-between gap-3">
          <ViewSwitch value={view} onChange={(v) => { setView(v); setPage(1) }} />
          {view === "list" ? <span className={`text-sm font-semibold ${mutedClass}`}>{pagination?.total_count ?? bookings.length} bookings</span> : null}
        </div>

        {view === "calendar" ? (
          <AdminCalendar />
        ) : (
          <>
            <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
              {STATUSES.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => { setFilter(status); setPage(1) }}
                  className={cn(
                    "shrink-0 rounded-full px-3.5 py-2 text-sm font-bold capitalize",
                    filter === status ? "bg-[#14100F] text-white" : "bg-white text-[#14100F]/70 shadow-sm",
                  )}
                >
                  {status.replace("_", " ")}
                </button>
              ))}
            </div>

            {isLoading ? (
              <p className={`text-sm ${mutedClass}`}>Loading bookings…</p>
            ) : bookings.length === 0 ? (
              <div className={`${cardClass} p-5`}>
                <p className="text-base font-bold">No bookings found</p>
                <p className={`mt-1 text-sm ${mutedClass}`}>Try another status filter or check back when new customer requests are submitted.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {bookings.map((b) => (
                  <BookingRow key={b.id} booking={b} />
                ))}
              </div>
            )}

            {pagination && pagination.total_pages > 1 ? (
              <div className="flex items-center justify-between pt-1">
                <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold shadow-sm disabled:opacity-40">
                  Prev
                </button>
                <span className={`text-sm ${mutedClass}`}>
                  Page {page} of {pagination.total_pages}
                </span>
                <button type="button" disabled={page >= pagination.total_pages} onClick={() => setPage((p) => p + 1)} className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold shadow-sm disabled:opacity-40">
                  Next
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}
