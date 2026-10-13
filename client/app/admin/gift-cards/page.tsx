"use client"

import { useState } from "react"
import { Plus } from "lucide-react"

import { AdminGiftCard, IssueGiftCardDialog } from "@/components/dashboard/gift-card-admin"
import { useAdminGiftCards } from "@/lib/hooks/use-admin"
import { AdminHeader } from "../admin-header"
import { adminScreenClass, mutedClass } from "../admin-theme"
import { EmptyCard, FilterChips, Pager } from "../ui"

const FILTERS = ["", "true", "false"] as const
const FILTER_LABEL: Record<string, string> = { "": "All", true: "Active", false: "Disabled" }

// The web Gift Cards page: issue cards, and per card send, enable or disable,
// delete and record a top-up (the web's own card component).
export default function AdminGiftCardsScreen() {
  const [page, setPage] = useState(1)
  const [active, setActive] = useState<(typeof FILTERS)[number]>("")
  const [creating, setCreating] = useState(false)
  const { data, isLoading } = useAdminGiftCards({ active: active || undefined, page })
  const cards = data?.data ?? []

  return (
    <div className={adminScreenClass}>
      <AdminHeader
        title="Gift cards"
        action={
          <button type="button" onClick={() => setCreating(true)} className="flex h-10 items-center gap-1 rounded-full bg-[#C96C83] px-4 text-sm font-bold text-white">
            <Plus className="size-4" aria-hidden /> Issue
          </button>
        }
      />
      <p className={`px-5 pb-3 text-sm ${mutedClass}`}>Issue, manage, and send gift cards.</p>
      {creating ? <IssueGiftCardDialog onClose={() => setCreating(false)} /> : null}
      <div className="space-y-3 px-5">
        <FilterChips
          options={FILTERS}
          value={active}
          onChange={(a) => {
            setActive(a)
            setPage(1)
          }}
          label={(a) => FILTER_LABEL[a]}
        />
        {isLoading ? (
          <p className={`text-sm ${mutedClass}`}>Loading gift cards…</p>
        ) : cards.length === 0 ? (
          <EmptyCard title="No gift cards yet" body="Issued gift cards will appear here." />
        ) : (
          cards.map((c) => <AdminGiftCard key={c.id} card={c} />)
        )}
        <Pager page={page} totalPages={data?.pagination?.total_pages} hasNext={!!data?.pagination?.next_page} onPage={setPage} />
      </div>
    </div>
  )
}
