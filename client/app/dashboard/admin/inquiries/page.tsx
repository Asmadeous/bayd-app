"use client"

import { useState } from "react"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Button } from "@/components/ui/button"
import { useAdminInquiries } from "@/lib/hooks/use-admin"

type InquiryType = "franchise" | "jobs" | "contacts"

export default function AdminInquiriesPage() {
  const [type, setType] = useState<InquiryType>("contacts")
  const [page, setPage] = useState(1)
  const { data, isLoading } = useAdminInquiries(type, page)
  const items = data?.data ?? []
  const pagination = data?.pagination

  return (
    <div className="space-y-6">
      <DashboardHeader title="Inquiries" subtitle="Review incoming contact, franchise, and job inquiries" />

      <div className="flex gap-2">
        {(["contacts", "franchise", "jobs"] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setType(t); setPage(1) }}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors capitalize"
            style={
              type === t
                ? { background: "#c96c83", color: "#fff" }
                : { background: "white", color: "#5f6268", border: "1px solid #e5e5e5" }
            }
          >
            {t}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-sm text-[#5f6268]">Loading…</div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-black/8 bg-white px-5 py-12 text-center text-sm text-[#5f6268]">
          No {type} inquiries.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, idx) => (
            <div key={idx} className="rounded-xl border border-black/8 bg-white px-5 py-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.entries(item)
                  .filter(([k]) => !["id", "created_at", "updated_at"].includes(k))
                  .map(([k, v]) => (
                    <div key={k}>
                      <span className="block text-xs font-medium text-[#5f6268] capitalize">{k.replace(/_/g, " ")}</span>
                      <span className="text-sm text-[#101217] break-words">{String(v ?? "—")}</span>
                    </div>
                  ))}
              </div>
              {typeof item.created_at === "string" && (
                <p className="text-xs text-[#5f6268] mt-2">
                  {new Date(item.created_at).toLocaleDateString("en-CA")}
                </p>
              )}
            </div>
          ))}
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
