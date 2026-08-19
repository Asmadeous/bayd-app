"use client"

import { useEffect, useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { Gift } from "lucide-react"

import { useToast } from "@/components/bayd-toast-provider"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardPage } from "@/components/dashboard/dashboard-page"
import { DashboardPanel } from "@/components/dashboard/dashboard-panel"
import { EmptyState } from "@/components/dashboard/empty-state"
import { GiftCardVisual } from "@/components/gift-card-visual"
import { TutorialButton } from "@/components/dashboard/tutorial-button"
import { Button } from "@/components/ui/button"
import api from "@/lib/api"
import { openHelcimPay } from "@/lib/helcim-pay"
import { useGiftCards, type GiftCard } from "@/lib/hooks/use-gift-cards"
import { customerGiftCardsSteps } from "@/lib/tours/customer-gift-cards-tour"

export default function CustomerGiftCardsPage() {
  const { toast } = useToast()
  const { data: cards = [], isError, isLoading } = useGiftCards()

  useEffect(() => {
    if (isError) {
      toast({
        title: "Gift cards could not be loaded",
        description: "Refresh the page or try again shortly.",
        variant: "error",
      })
    }
  }, [isError, toast])

  return (
    <DashboardPage maxWidth="wide">
      <div data-tour="customer-giftcards-header">
        <DashboardHeader title="Gift Cards" subtitle="Cards you have purchased or received." />
      </div>

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
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" data-tour="customer-giftcards-list">
          {cards.map((card) => (
            <CustomerCard key={card.id} card={card} />
          ))}
        </div>
      )}

      <TutorialButton steps={customerGiftCardsSteps} pageKey="customer-gift-cards" />
    </DashboardPage>
  )
}

function CustomerCard({ card }: { card: GiftCard }) {
  const { toast } = useToast()
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
        const message = "Could not start payment."
        setStatus({ type: "error", text: message })
        toast({ title: "Payment could not be started", description: message, variant: "error" })
        return
      }

      const result = await openHelcimPay(data.checkout_token).catch(() => "error" as const)
      if (result === "success") {
        setAmount("")
        const message = "Balance updates once payment clears."
        setStatus({ type: "success", text: `Funds added. ${message}` })
        toast({ title: "Gift card top-up started", description: message, variant: "success" })
      } else if (result === "error") {
        const message = "Payment could not be completed."
        setStatus({ type: "error", text: message })
        toast({ title: "Payment failed", description: message, variant: "error" })
      }
    },
    onError: (error) => {
      const message = getApiErrorMessage(error, "Could not start the top-up.")
      setStatus({ type: "error", text: message })
      toast({ title: "Top-up failed", description: message, variant: "error" })
    },
  })

  function addFunds() {
    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0) {
      const message = "Enter an amount greater than $0."
      setStatus({ type: "error", text: message })
      toast({ title: "Invalid amount", description: message, variant: "error" })
      return
    }
    topup.mutate()
  }

  return (
    <DashboardPanel className="space-y-3 p-4">
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
      <div className="flex flex-wrap items-center gap-2 border-t border-black/8 pt-3" data-tour="customer-giftcards-topup">
        <input
          type="number"
          min="0"
          step="1"
          inputMode="decimal"
          placeholder="Add funds $"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="h-9 w-32 border border-black/15 px-2 text-sm focus:border-[#c96c83] focus:outline-none"
        />
        <Button size="xs" variant="outline" disabled={topup.isPending || !amount} onClick={addFunds}>
          {topup.isPending ? "..." : "Add funds"}
        </Button>
      </div>
      {status ? (
        <p className={`text-xs font-semibold ${status.type === "success" ? "text-green-700" : "text-red-700"}`}>
          {status.text}
        </p>
      ) : null}
    </DashboardPanel>
  )
}

function getApiErrorMessage(error: unknown, fallback: string) {
  const data = (error as { response?: { data?: { error?: string; errors?: string[] } } })?.response?.data
  return data?.error ?? data?.errors?.join(", ") ?? fallback
}
