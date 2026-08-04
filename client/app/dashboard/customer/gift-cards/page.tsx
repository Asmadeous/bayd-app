"use client"

import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { GiftCardVisual } from "@/components/gift-card-visual"
import { Button } from "@/components/ui/button"
import { useGiftCards, type GiftCard } from "@/lib/hooks/use-gift-cards"
import api from "@/lib/api"
import { openHelcimPay } from "@/lib/helcim-pay"

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
            <CustomerCard key={card.id} card={card} />
          ))}
        </div>
      )}
    </div>
  )
}

function CustomerCard({ card }: { card: GiftCard }) {
  const [amount, setAmount] = useState("")
  const [status, setStatus] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const topup = useMutation({
    mutationFn: () =>
      api
        .post<{ checkout_token?: string }>(`/gift_cards/${card.code}/topup`, { amount: Number(amount) })
        .then((r) => r.data),
    onSuccess: async (data) => {
      setStatus(null)
      if (!data.checkout_token) {
        setStatus({ type: "error", text: "Could not start payment." })
        return
      }
      const result = await openHelcimPay(data.checkout_token)
      if (result === "success") {
        setAmount("")
        setStatus({ type: "success", text: "Funds added — balance updates once payment clears." })
      } else if (result === "error") {
        setStatus({ type: "error", text: "Payment could not be completed." })
      }
    },
    onError: () => setStatus({ type: "error", text: "Could not start the top-up." }),
  })

  function addFunds() {
    const value = Number(amount)
    if (!value || value <= 0) return
    topup.mutate()
  }

  return (
    <div className="space-y-2">
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

      {/* Add funds by card */}
      <div className="flex items-center gap-1.5 px-1">
        <input
          type="number" min="0" step="1" inputMode="decimal" placeholder="Add funds $"
          value={amount} onChange={(e) => setAmount(e.target.value)}
          className="h-8 w-28 rounded-lg border border-black/15 px-2 text-sm focus:border-[#c96c83] focus:outline-none"
        />
        <Button size="xs" variant="outline" disabled={topup.isPending || !amount} onClick={addFunds}>
          {topup.isPending ? "…" : "Add funds"}
        </Button>
      </div>
      {status ? (
        <p className={`px-1 text-xs font-medium ${status.type === "success" ? "text-green-700" : "text-red-700"}`}>
          {status.text}
        </p>
      ) : null}
    </div>
  )
}
