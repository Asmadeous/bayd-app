"use client"

import { History } from "lucide-react"

import { BookingRow } from "@/components/calendar/booking-row"
import { LoadMore } from "@/components/load-more"
import { useEmployeeScheduleList } from "@/lib/hooks/use-employee"
import { StaffHeader } from "../staff-header"
import { cardClass, mutedClass, staffScreenClass } from "../staff-theme"

// The tech's job history (completed, cancelled, no-show, missed), latest first.
export default function StaffPastJobsScreen() {
  const { items, isLoading, hasMore, loadingMore, loadMore } = useEmployeeScheduleList("past")

  return (
    <div className={staffScreenClass}>
      <StaffHeader back title="Past jobs" />
      <div className="px-5">
        {isLoading ? (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <div key={i} className="h-36 animate-pulse rounded-2xl bg-black/5" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className={`${cardClass} flex flex-col items-center gap-2 p-8 text-center`}>
            <History className="size-7 text-[#C96C83]" aria-hidden />
            <p className="font-bold">No past jobs</p>
            <p className={`text-sm ${mutedClass}`}>Completed, cancelled, and no-show jobs appear here.</p>
          </div>
        ) : (
          <>
            <ul className="space-y-3">
              {items.map((b) => (
                <BookingRow key={b.id} booking={b} who={b.customer_name} href={`/staff/schedule/job?id=${b.id}`} />
              ))}
            </ul>
            <LoadMore className="mt-3" hasMore={hasMore} loading={loadingMore} onLoad={loadMore} />
          </>
        )}
      </div>
    </div>
  )
}
