"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { NewsletterComposer } from "@/components/dashboard/newsletter-composer"
import { StatusBadge } from "@/components/dashboard/status-badge"
import api from "@/lib/api"
import { useConfirm, useToast } from "@/lib/app-ui/app-ui-provider"
import { formatBookingDate } from "@/lib/booking-time"
import { cn } from "@/lib/utils"
import { AdminHeader } from "../admin-header"
import { adminScreenClass, cardClass, mutedClass } from "../admin-theme"
import { apiError, EmptyCard, Pager } from "../ui"

interface Subscriber {
  id: number
  email: string
  status: "subscribed" | "unsubscribed" | "bounced"
  created_at: string
}

type Paged = { data: Subscriber[]; pagination: { current_page: number; total_pages: number; next_page: number | null; total_count: number } }

// The web Newsletter page: write and send newsletters (the web's composer),
// and the subscriber list with Remove.
export default function AdminNewsletterScreen() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const confirm = useConfirm()
  const [page, setPage] = useState(1)
  const { data, isLoading } = useQuery<Paged>({
    queryKey: ["admin-newsletter", page],
    queryFn: () => api.get<Paged>("/admin/newsletter_subscribers", { params: { page } }).then((r) => r.data),
  })
  const del = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/newsletter_subscribers/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-newsletter"] })
      toast({ title: "Subscriber removed", description: "The email has been unsubscribed from the newsletter.", variant: "success" })
    },
    onError: (e) => toast({ title: "Subscriber not removed", description: apiError(e, "Could not remove this newsletter subscriber."), variant: "error" }),
  })
  const subscribers = data?.data ?? []

  async function remove(s: Subscriber) {
    const ok = await confirm({
      title: "Remove newsletter subscriber?",
      message: `This will unsubscribe ${s.email} from the newsletter. They will no longer receive newsletter emails.`,
      confirmLabel: "Remove subscriber",
      tone: "danger",
    })
    if (ok) del.mutate(s.id)
  }

  return (
    <div className={adminScreenClass}>
      <AdminHeader title="Newsletter" />
      <p className={`px-5 pb-3 text-sm ${mutedClass}`}>Write newsletters and manage subscribers.</p>
      <div className="space-y-3 px-5">
        <NewsletterComposer />
        <div className={cn(cardClass, "bg-[#14100F] p-4 text-white")}>
          <p className="text-xs font-bold uppercase tracking-wide text-white/70">Sign-ups (all time)</p>
          <p className="mt-1 text-2xl font-black">{data?.pagination?.total_count ?? "-"}</p>
        </div>
        {isLoading ? (
          <p className={`text-sm ${mutedClass}`}>Loading subscribers…</p>
        ) : subscribers.length === 0 ? (
          <EmptyCard title="No subscribers yet" body="Newsletter subscribers will appear here." />
        ) : (
          subscribers.map((s) => (
            <section key={s.id} className={`${cardClass} flex items-center justify-between gap-3 p-4`}>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{s.email}</p>
                <div className="mt-1 flex items-center gap-2">
                  <StatusBadge tone={s.status === "subscribed" ? "green" : "gray"}>
                    {s.status === "subscribed" ? "Subscribed" : s.status === "bounced" ? "Bounced" : "Unsubscribed"}
                  </StatusBadge>
                  <span className={`text-xs ${mutedClass}`}>{formatBookingDate(s.created_at, { month: "short", day: "numeric", year: "numeric" })}</span>
                </div>
              </div>
              <button
                type="button"
                disabled={del.isPending}
                onClick={() => remove(s)}
                className="h-10 shrink-0 rounded-xl border border-black/10 bg-white px-4 text-sm font-bold text-[#8f3f4b] disabled:opacity-40"
              >
                Remove
              </button>
            </section>
          ))
        )}
        <Pager page={page} totalPages={data?.pagination?.total_pages} hasNext={!!data?.pagination?.next_page} onPage={setPage} />
      </div>
    </div>
  )
}
