"use client"

import { useState } from "react"
import { useMutation } from "@tanstack/react-query"

import { useToast } from "@/components/bayd-toast-provider"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardPage } from "@/components/dashboard/dashboard-page"
import { TutorialButton } from "@/components/dashboard/tutorial-button"
import { GiftCardVisual } from "@/components/gift-card-visual"
import { Button } from "@/components/ui/button"
import api from "@/lib/api"
import type { GiftCard } from "@/lib/hooks/use-gift-cards"
import { employeeGiftCardsSteps } from "@/lib/tours/employee-tour"

const inputCls =
  "h-10 rounded-lg border border-black/15 px-3 text-sm text-[#101217] focus:border-[#c96c83] focus:outline-none"

export default function EmployeeGiftCardsPage() {
  const { toast } = useToast()
  const [code, setCode] = useState("")
  const [card, setCard] = useState<GiftCard | null>(null)
  const [amount, setAmount] = useState("")
  const [method, setMethod] = useState("pos")
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const lookup = useMutation({
    mutationFn: () =>
      api.get<GiftCard>(`/employee/gift_cards/${encodeURIComponent(code.trim())}`).then((r) => r.data),
    onSuccess: (data) => {
      setCard(data)
      setMsg(null)
      toast({ title: "Gift card found", variant: "success" })
    },
    onError: (error: unknown) => {
      setCard(null)
      const message = getApiErrorMessage(error, "No gift card with that code.")
      setMsg({ type: "error", text: message })
      toast({ title: "Gift card not found", description: message, variant: "error" })
    },
  })

  const topup = useMutation({
    mutationFn: () =>
      api
        .post<GiftCard>(`/employee/gift_cards/${encodeURIComponent(code.trim())}/topup`, {
          amount: Number(amount),
          method,
        })
        .then((r) => r.data),
    onSuccess: (data) => {
      setCard(data)
      setAmount("")
      const message = `Paid. Balance is now ${formatCurrency(data.current_balance)}.`
      setMsg({ type: "success", text: message })
      toast({ title: "Top-up recorded", description: message, variant: "success" })
    },
    onError: (error: unknown) => {
      const message = getApiErrorMessage(error, "Could not add funds. Check the amount and try again.")
      setMsg({ type: "error", text: message })
      toast({ title: "Top-up not recorded", description: message, variant: "error" })
    },
  })

  function submitTopup() {
    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0) {
      const message = "Enter a top-up amount greater than 0."
      setMsg({ type: "error", text: message })
      toast({ title: "Top-up needs attention", description: message, variant: "error" })
      return
    }

    topup.mutate()
  }

  return (
    <DashboardPage maxWidth="wide">
      <div className="space-y-6">
        <div data-tour="giftcards-header">
          <DashboardHeader title="Gift Card Top-up" subtitle="Look up a customer's card and add funds paid in person" />
        </div>

        <div data-tour="giftcards-lookup" className="max-w-md space-y-3 rounded-xl border border-black/8 bg-white p-5">
          <label className="block text-xs font-medium text-[#5f6268]">Gift card code</label>
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="BAYD-…"
              className={`${inputCls} flex-1`}
            />
            <Button
              variant="outline"
              disabled={lookup.isPending || !code.trim()}
              onClick={() => lookup.mutate()}
            >
              {lookup.isPending ? "…" : "Look up"}
            </Button>
          </div>
        </div>

        {card ? (
          <div data-tour="giftcards-topup" className="max-w-md space-y-3">
            <GiftCardVisual
              code={card.code}
              balance={card.current_balance}
              expiresAt={card.expires_at}
              recipientName={card.recipient_name}
              active={card.active}
            />

            <div className="flex items-end gap-2 rounded-xl border border-black/8 bg-white p-4">
              <div>
                <label className="block text-xs font-medium text-[#5f6268] mb-1">Amount</label>
                <input
                  type="number" min="0" step="1" inputMode="decimal" placeholder="$"
                  value={amount} onChange={(e) => setAmount(e.target.value)}
                  className={`${inputCls} w-28`}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#5f6268] mb-1">Paid via</label>
                <select value={method} onChange={(e) => setMethod(e.target.value)} className={inputCls}>
                  <option value="pos">POS</option>
                  <option value="card">Card</option>
                  <option value="cash">Cash</option>
                </select>
              </div>
              <Button
                disabled={topup.isPending || !amount}
                onClick={submitTopup}
                style={{ background: "#c96c83", border: "none", color: "#fff" }}
              >
                {topup.isPending ? "…" : "Mark paid"}
              </Button>
            </div>
          </div>
        ) : null}

        {msg ? (
          <p className={`text-sm font-medium ${msg.type === "success" ? "text-green-700" : "text-red-700"}`}>
            {msg.text}
          </p>
        ) : null}
      </div>

      <TutorialButton steps={employeeGiftCardsSteps} pageKey="employee-gift-cards" />
    </DashboardPage>
  )
}

function formatCurrency(value: unknown) {
  const amount = Number(value)
  return Number.isFinite(amount) ? `$${amount.toFixed(2)}` : "-"
}

function getApiErrorMessage(error: unknown, fallback: string) {
  const data = (error as { response?: { data?: { error?: string; errors?: string[] } } })?.response?.data
  return data?.error ?? data?.errors?.join(", ") ?? fallback
}
