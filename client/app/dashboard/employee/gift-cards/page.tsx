"use client"

import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { GiftCardVisual } from "@/components/gift-card-visual"
import { Button } from "@/components/ui/button"
import api from "@/lib/api"
import type { GiftCard } from "@/lib/hooks/use-gift-cards"

const inputCls =
  "h-10 rounded-lg border border-black/15 px-3 text-sm text-[#101217] focus:border-[#c96c83] focus:outline-none"

export default function EmployeeGiftCardsPage() {
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
    },
    onError: () => {
      setCard(null)
      setMsg({ type: "error", text: "No gift card with that code." })
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
      setMsg({ type: "success", text: `Paid. Balance is now $${Number(data.current_balance).toFixed(2)}.` })
    },
    onError: () => setMsg({ type: "error", text: "Could not add funds. Check the amount and try again." }),
  })

  return (
    <div className="space-y-6">
      <DashboardHeader title="Gift Card Top-up" subtitle="Look up a customer's card and add funds paid in person" />

      <div className="max-w-md space-y-3 rounded-xl border border-black/8 bg-white p-5">
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
        <div className="max-w-md space-y-3">
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
              onClick={() => topup.mutate()}
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
  )
}
