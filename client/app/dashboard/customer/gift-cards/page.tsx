"use client"

import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { GiftCardVisual } from "@/components/gift-card-visual"
import { useGiftCards } from "@/lib/hooks/use-gift-cards"

export default function CustomerGiftCardsPage() {
  const { data: cards = [], isLoading } = useGiftCards()

  return (
    <div className="space-y-6">
      <DashboardHeader title="Gift Cards" subtitle="Cards you've purchased or received" />

      {isLoading ? (
        <div className="text-sm text-[#5f6268]">Loading…</div>
      ) : cards.length === 0 ? (
        <div className="rounded-xl border border-black/8 bg-white px-5 py-12 text-center text-sm text-[#5f6268]">
          No gift cards yet.
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <div key={card.id} className="space-y-2">
              <GiftCardVisual
                code={card.code}
                balance={card.current_balance}
                expiresAt={card.expires_at}
                recipientName={card.recipient_name}
                active={card.active}
              />
              <p className="px-1 text-xs text-[#5f6268]">
                {card.recipient_email ? `Sent to ${card.recipient_email}` : "Saved to your account"}
                {card.delivered_at ? " · delivered" : ""}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
