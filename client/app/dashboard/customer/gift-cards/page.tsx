"use client"

import { Gift } from "lucide-react"

import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardPage } from "@/components/dashboard/dashboard-page"
import { DashboardPanel } from "@/components/dashboard/dashboard-panel"
import { EmptyState } from "@/components/dashboard/empty-state"
import { GiftCardVisual } from "@/components/gift-card-visual"
import { useGiftCards } from "@/lib/hooks/use-gift-cards"

export default function CustomerGiftCardsPage() {
  const { data: cards = [], isLoading } = useGiftCards()

  return (
    <DashboardPage maxWidth="wide">
      <DashboardHeader title="Gift Cards" subtitle="Cards you have purchased or received." />

      {isLoading ? (
        <DashboardPanel>
          <p className="text-sm text-[#5f6268]">Loading gift cards...</p>
        </DashboardPanel>
      ) : cards.length === 0 ? (
        <EmptyState
          icon={Gift}
          title="No gift cards yet"
          description="Purchased and received gift cards will appear here."
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <DashboardPanel className="space-y-3 p-4" key={card.id}>
              <GiftCardVisual
                active={card.active}
                balance={card.current_balance}
                code={card.code}
                expiresAt={card.expires_at}
                recipientName={card.recipient_name}
              />
              <p className="text-xs font-semibold leading-5 text-[#5f6268]">
                {card.recipient_email ? `Sent to ${card.recipient_email}` : "Saved to your account"}
                {card.delivered_at ? " / delivered" : ""}
              </p>
            </DashboardPanel>
          ))}
        </div>
      )}
    </DashboardPage>
  )
}
