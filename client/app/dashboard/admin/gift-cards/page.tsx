"use client"

import { useEffect, useState } from "react"
import { Gift, Plus } from "lucide-react"

import { useToast } from "@/components/bayd-toast-provider"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardPage } from "@/components/dashboard/dashboard-page"
import { DashboardPanel } from "@/components/dashboard/dashboard-panel"
import {
  DashboardToolbar,
  SegmentedControl,
  SegmentButton,
  ToolbarSection,
} from "@/components/dashboard/dashboard-toolbar"
import { EmptyState } from "@/components/dashboard/empty-state"
import { AdminGiftCard, IssueGiftCardDialog } from "@/components/dashboard/gift-card-admin"
import { TutorialButton } from "@/components/dashboard/tutorial-button"
import { Button } from "@/components/ui/button"
import { useAdminGiftCards } from "@/lib/hooks/use-admin"
import { adminGiftCardsSteps } from "@/lib/tours/admin-gift-cards-tour"

export default function AdminGiftCardsPage() {
  const { toast } = useToast()
  const [page, setPage] = useState(1)
  const [active, setActive] = useState("")
  const [creating, setCreating] = useState(false)
  const { data, isError, isLoading } = useAdminGiftCards({ active: active || undefined, page })
  const cards = data?.data ?? []

  useEffect(() => {
    if (isError) {
      toast({
        title: "Gift cards not loaded",
        description: "Could not load gift cards.",
        variant: "error",
      })
    }
  }, [isError, toast])

  return (
    <DashboardPage maxWidth="wide">
      <div data-tour="admin-giftcards-header">
        <DashboardHeader
          title="Gift Cards"
          subtitle="Issue, manage, and send gift cards."
          actions={
            <Button size="sm" onClick={() => setCreating(true)} style={{ background: "#c96c83", border: "none", color: "#fff" }}>
              <Plus className="size-4" /> Issue card
            </Button>
          }
        />
      </div>

      <DashboardToolbar data-tour="admin-giftcards-filters">
        <ToolbarSection>
          <SegmentedControl>
        {[["", "All"], ["true", "Active"], ["false", "Disabled"]].map(([v, l]) => (
          <SegmentButton active={active === v} key={l} onClick={() => setActive(v)}>
            {l}
          </SegmentButton>
        ))}
          </SegmentedControl>
        </ToolbarSection>
      </DashboardToolbar>

      {creating ? <IssueGiftCardDialog onClose={() => setCreating(false)} /> : null}

      {isLoading ? (
        <DashboardPanel>
          <p className="text-sm text-[#5f6268]">Loading gift cards...</p>
        </DashboardPanel>
      ) : cards.length === 0 ? (
        <EmptyState
          icon={Gift}
          title="No gift cards yet"
          description="Issued gift cards will appear here."
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" data-tour="admin-giftcards-grid">
          {cards.map((c) => (
            <AdminGiftCard key={c.id} card={c} />
          ))}
        </div>
      )}

      {data?.pagination && data.pagination.total_pages > 1 && (
        <DashboardToolbar className="justify-end">
          <ToolbarSection className="ml-auto">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
          <span className="px-2 text-sm font-semibold text-[#5f6268]">{page} / {data.pagination.total_pages}</span>
          <Button variant="outline" size="sm" disabled={!data.pagination.next_page} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </ToolbarSection>
        </DashboardToolbar>
      )}

      <TutorialButton steps={adminGiftCardsSteps} pageKey="admin-gift-cards" />
    </DashboardPage>
  )
}
