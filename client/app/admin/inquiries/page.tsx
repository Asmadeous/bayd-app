"use client"

import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Mail } from "lucide-react"

import api from "@/lib/api"
import { useToast } from "@/lib/app-ui/app-ui-provider"
import { formatBookingDate } from "@/lib/booking-time"
import { useAdminInquiries } from "@/lib/hooks/use-admin"
import { AdminHeader } from "../admin-header"
import { adminScreenClass, cardClass, eyebrowClass, mutedClass } from "../admin-theme"
import { EmptyCard, FilterChips, Pager } from "../ui"

const TYPES = ["contacts", "franchise", "jobs"] as const
type InquiryType = (typeof TYPES)[number]

// Status keys per inquiry type (the Rails enum keys), with the label admins see.
const STATUSES: Record<InquiryType, { value: string; label: string }[]> = {
  contacts: [
    { value: "unread", label: "New" },
    { value: "read", label: "Read" },
    { value: "replied", label: "Replied" },
  ],
  franchise: [
    { value: "unread", label: "New" },
    { value: "contacted", label: "Contacted" },
    { value: "closed", label: "Closed" },
  ],
  jobs: [
    { value: "unread", label: "New" },
    { value: "reviewing", label: "Reviewing" },
    { value: "rejected", label: "Rejected" },
    { value: "hired", label: "Hired" },
  ],
}

// The web Inquiries page: contact, franchise and job inquiries with every
// field, reply by email, and status.
export default function AdminInquiriesScreen() {
  const [type, setType] = useState<InquiryType>("contacts")
  const [page, setPage] = useState(1)
  const { data, isLoading } = useAdminInquiries(type, page)
  const items = data?.data ?? []

  return (
    <div className={adminScreenClass}>
      <AdminHeader title="Inquiries" />
      <p className={`px-5 pb-3 text-sm ${mutedClass}`}>Review incoming contact, franchise, and job inquiries.</p>
      <div className="space-y-3 px-5">
        <FilterChips
          options={TYPES}
          value={type}
          onChange={(t) => {
            setType(t)
            setPage(1)
          }}
        />
        {isLoading ? (
          <p className={`text-sm ${mutedClass}`}>Loading inquiries…</p>
        ) : items.length === 0 ? (
          <EmptyCard title={`No ${type} inquiries`} body="New inquiry submissions will appear here." />
        ) : (
          items.map((item, index) => (
            <section key={typeof item.id === "number" ? item.id : index} className={`${cardClass} space-y-3 p-4`}>
              {Object.entries(item)
                .filter(([key]) => !["id", "created_at", "updated_at", "status", "franchise_id"].includes(key))
                .map(([key, value]) => (
                  <div key={key}>
                    <p className={eyebrowClass}>{key.replace(/_/g, " ")}</p>
                    <p className="mt-0.5 break-words text-sm font-semibold">{String(value ?? "-")}</p>
                  </div>
                ))}
              <div className="flex flex-wrap items-center gap-3 border-t border-black/5 pt-3">
                {typeof item.created_at === "string" ? (
                  <span className={`text-xs font-semibold ${mutedClass}`}>
                    {formatBookingDate(item.created_at, { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                ) : null}
                {typeof item.email === "string" && item.email ? (
                  <a href={`mailto:${item.email}`} className="inline-flex items-center gap-1 text-sm font-bold text-[#C96C83]">
                    <Mail className="size-4" aria-hidden /> Reply by email
                  </a>
                ) : null}
                {typeof item.id === "number" && typeof item.status === "string" ? (
                  <span className="ml-auto">
                    <InquiryStatus type={type} id={item.id} status={item.status} />
                  </span>
                ) : null}
              </div>
            </section>
          ))
        )}
        <Pager page={page} totalPages={data?.pagination?.total_pages} hasNext={!!data?.pagination?.next_page} onPage={setPage} />
      </div>
    </div>
  )
}

function InquiryStatus({ type, id, status }: { type: InquiryType; id: number; status: string }) {
  const { toast } = useToast()
  const qc = useQueryClient()
  const update = useMutation({
    mutationFn: (next: string) => api.patch(`/admin/inquiries/${type}/${id}`, { status: next }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-inquiries"] }),
    onError: () => toast({ title: "Status not saved", variant: "error" }),
  })
  return (
    <select
      aria-label="Status"
      value={status}
      disabled={update.isPending}
      onChange={(e) => update.mutate(e.target.value)}
      className="h-10 rounded-xl border border-black/10 bg-white px-3 text-sm font-semibold outline-none focus:border-[#C96C83]"
    >
      {STATUSES[type].map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  )
}
