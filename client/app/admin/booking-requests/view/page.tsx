"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"

import api from "@/lib/api"
import { AdminHeader } from "../../admin-header"
import { adminScreenClass, cardClass, eyebrowClass, mutedClass } from "../../admin-theme"
import { formatAddress, formatStatus, formatWhen, personName, type BookingRequestDetail } from "../types"

export default function AdminBookingRequestScreen() {
  // useSearchParams needs a Suspense boundary for the static export.
  return (
    <Suspense>
      <RequestDetail />
    </Suspense>
  )
}

// The web page's "Assignment details": the request, then every assignment
// attempt with who was chosen and which techs were candidates.
function RequestDetail() {
  const id = Number(useSearchParams().get("id"))
  const { data: detail, isLoading, isError } = useQuery<BookingRequestDetail>({
    queryKey: ["admin-booking-request", id],
    queryFn: () => api.get<BookingRequestDetail>(`/admin/booking_requests/${id}`).then((r) => r.data),
    enabled: id > 0,
  })

  return (
    <div className={adminScreenClass}>
      <AdminHeader back title="Assignment details" />
      <div className="space-y-4 px-5">
        {isLoading ? (
          <p className={`text-sm ${mutedClass}`}>Loading request details…</p>
        ) : isError || !detail ? (
          <p className="text-sm font-semibold text-[#8f3f4b]">Could not load assignment details for this request.</p>
        ) : (
          <>
            <section className={`${cardClass} grid grid-cols-2 gap-x-3 gap-y-3 p-5`}>
              <Item label="Status" value={formatStatus(detail.status)} />
              <Item label="Type" value={formatStatus(detail.kind)} />
              <Item label="Requested" value={detail.requested_start ? formatWhen(detail.requested_start) : "Immediate"} />
              <Item label="Customer" value={personName(detail.user) || "-"} />
              <Item label="Service" value={detail.service?.name ?? "-"} />
              <Item label="Address" value={formatAddress(detail.address)} />
            </section>

            <section>
              <p className={`${eyebrowClass} mb-2`}>Assignment attempts</p>
              {detail.assignment_attempts?.length ? (
                <div className="space-y-2">
                  {detail.assignment_attempts.map((a) => (
                    <div key={a.id} className={`${cardClass} p-4`}>
                      <p className="text-base font-semibold">{a.reason || "Assignment attempted"}</p>
                      <p className={`mt-1 text-sm ${mutedClass}`}>
                        Chosen: {a.chosen_employee ? personName(a.chosen_employee.user) || "technician" : "None"}
                      </p>
                      {a.candidates?.length ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {a.candidates.map((c, i) => (
                            <span key={`${a.id}-${c.employee_id ?? i}`} className="rounded-md bg-black/5 px-2 py-1 text-xs font-semibold text-[#14100F]/65">
                              #{c.employee_id ?? "?"}
                              {c.distance_km != null ? ` / ${c.distance_km} km` : ""}
                              {c.source ? ` / ${c.source}` : ""}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className={`mt-2 text-xs ${mutedClass}`}>No eligible candidates were recorded.</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className={`text-sm ${mutedClass}`}>No assignment attempts recorded yet.</p>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className={eyebrowClass}>{label}</p>
      <p className="mt-0.5 break-words text-sm font-semibold">{value}</p>
    </div>
  )
}
