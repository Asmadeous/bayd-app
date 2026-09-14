"use client"

import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { Gift, Search } from "lucide-react"

import api from "@/lib/api"
import type { GiftCard } from "@/lib/hooks/use-gift-cards"
import { useToast } from "@/lib/app-ui/app-ui-provider"
import { staffScreenClass, cardClass, inputClass, labelClass, mutedClass } from "../staff-theme"
import { StaffHeader } from "../staff-header"

// Staff gift-card tool: look up a card by code and add funds (top-up) for a
// client paying in person. Same /employee/gift_cards endpoints the desktop uses.
export default function StaffGiftCardsScreen() {
  const { toast } = useToast()
  const [code, setCode] = useState("")
  const [amount, setAmount] = useState("")
  const [card, setCard] = useState<GiftCard | null>(null)

  const lookup = useMutation({
    mutationFn: () =>
      api.get<GiftCard>(`/employee/gift_cards/${encodeURIComponent(code.trim())}`).then((r) => r.data),
    onSuccess: (data) => setCard(data),
    onError: (e: unknown) => {
      setCard(null)
      toast({ title: "Not found", description: apiError(e, "No gift card with that code."), variant: "error" })
    },
  })

  const topup = useMutation({
    mutationFn: () =>
      api
        .post<GiftCard>(`/employee/gift_cards/${encodeURIComponent(code.trim())}/topup`, { amount: Number(amount) })
        .then((r) => r.data),
    onSuccess: (data) => {
      setCard(data)
      setAmount("")
      toast({ title: "Funds added", description: `Balance is now ${money(data.current_balance)}.`, variant: "success" })
    },
    onError: (e: unknown) => {
      toast({ title: "Couldn't add funds", description: apiError(e, "Check the amount and try again."), variant: "error" })
    },
  })

  function doTopup() {
    const v = Number(amount)
    if (!Number.isFinite(v) || v <= 0) {
      toast({ title: "Enter an amount", description: "Amount must be greater than 0.", variant: "warning" })
      return
    }
    topup.mutate()
  }

  return (
    <div className={staffScreenClass}>
      <StaffHeader title="Gift cards" subtitle="Look up a card and add funds." />

      <div className="space-y-4 px-5">
        <div className={`${cardClass} space-y-3 p-4`}>
          <div>
            <label className={labelClass}>Gift card code</label>
            <div className="flex gap-2">
              <input
                className={inputClass}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter code"
                autoCapitalize="characters"
              />
              <button
                type="button"
                onClick={() => code.trim() && lookup.mutate()}
                disabled={lookup.isPending || !code.trim()}
                aria-label="Look up"
                className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#14100F] text-white disabled:opacity-40"
              >
                <Search className="size-5" aria-hidden />
              </button>
            </div>
          </div>
        </div>

        {card && (
          <div className={`${cardClass} p-5`}>
            <div className="flex items-start justify-between">
              <div>
                <p className={`text-xs font-bold uppercase tracking-[0.16em] ${mutedClass}`}>Balance</p>
                <p className="mt-1 text-3xl font-black">{money(card.current_balance)}</p>
              </div>
              <Gift className="size-7 text-[#C96C83]" aria-hidden />
            </div>
            <p className={`mt-2 text-sm ${mutedClass}`}>
              Code <span className="font-bold text-[#14100F]">{card.code}</span>
              {card.active ? "" : " · inactive"}
            </p>

            <div className="mt-4 border-t border-black/[0.06] pt-4">
              <label className={labelClass}>Add funds</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[#8a8d93]">$</span>
                  <input
                    className={`${inputClass} pl-7`}
                    type="number"
                    min="0"
                    step="1"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Amount"
                  />
                </div>
                <button
                  type="button"
                  onClick={doTopup}
                  disabled={topup.isPending || !amount}
                  className="shrink-0 rounded-xl bg-[#C96C83] px-5 text-sm font-bold text-white disabled:opacity-40"
                >
                  {topup.isPending ? "…" : "Add"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function money(v: string) {
  return `$${Number(v).toFixed(2)}`
}
function apiError(e: unknown, fallback: string) {
  const d = (e as { response?: { data?: { error?: string; errors?: string[] } } })?.response?.data
  return d?.error ?? d?.errors?.join(", ") ?? fallback
}
