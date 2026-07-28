"use client"

import { useState } from "react"
import { CreditCard, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { usePaymentMethod, useRemoveCard, useCardSession } from "@/lib/hooks/use-account"

// Card on file for booking auto-charge. The backend creates a Moneris hosted
// tokenization session and returns its URL; we just redirect there. The card is
// vaulted on Moneris' page and the data key arrives via the backend webhook.
export function CardOnFile() {
  const { data: method, isLoading } = usePaymentMethod()
  const removeCard = useRemoveCard()
  const session = useCardSession()
  const [error, setError] = useState<string | null>(null)

  async function addCard() {
    setError(null)
    try {
      const { redirect_url } = await session.mutateAsync()
      window.location.href = redirect_url
    } catch (e) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg ?? "Card entry isn't available yet.")
    }
  }

  return (
    <div className="rounded-xl border border-black/8 bg-white p-6 max-w-lg">
      <div className="flex items-center gap-2.5 mb-4">
        <CreditCard className="size-4 text-[#c96c83]" />
        <h3 className="font-semibold text-sm text-[#101217]">Card on file</h3>
      </div>

      <p className="text-sm text-[#5f6268] mb-4">
        Save a card to enable automatic payment for recurring bookings.
      </p>

      {isLoading ? (
        <p className="text-sm text-[#5f6268]">Loading…</p>
      ) : method?.has_card ? (
        <div className="flex items-center justify-between rounded-xl bg-[#f4f1eb] px-4 py-3">
          <span className="text-sm font-medium text-[#101217]">
            {method.brand} •••• {method.last4}
          </span>
          <button
            onClick={() => removeCard.mutate()}
            disabled={removeCard.isPending}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#d4754a] hover:underline"
          >
            <Trash2 className="size-3.5" /> Remove
          </button>
        </div>
      ) : (
        <>
          <Button
            onClick={addCard}
            disabled={session.isPending}
            style={{ background: "#c96c83", border: "none", color: "#fff" }}
          >
            {session.isPending ? "Opening secure form…" : "Add a card"}
          </Button>
          {error && <p className="mt-3 text-xs text-[#d4754a]">{error}</p>}
        </>
      )}
    </div>
  )
}
