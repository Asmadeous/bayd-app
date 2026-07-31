"use client"

import { useEffect, useRef, useState } from "react"
import { CreditCard, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { usePaymentMethod, useRemoveCard, useSaveCard } from "@/lib/hooks/use-account"

const APP_ID = process.env.NEXT_PUBLIC_SQUARE_APP_ID ?? ""
const LOCATION_ID = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID ?? ""
const SDK_URL = APP_ID.startsWith("sandbox-")
  ? "https://sandbox.web.squarecdn.com/v1/square.js"
  : "https://web.squarecdn.com/v1/square.js"

type SquareCard = {
  attach: (selector: string) => Promise<void>
  tokenize: () => Promise<{ status: string; token?: string; errors?: { message: string }[] }>
  destroy?: () => void
}
declare global {
  interface Window {
    Square?: { payments: (appId: string, locationId: string) => { card: () => Promise<SquareCard> } }
  }
}

function loadSquareSdk(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Square) return resolve()
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SDK_URL}"]`)
    if (existing) {
      existing.addEventListener("load", () => resolve())
      existing.addEventListener("error", () => reject(new Error("Could not load Square.")))
      return
    }
    const s = document.createElement("script")
    s.src = SDK_URL
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error("Could not load Square."))
    document.head.appendChild(s)
  })
}

// Card on file for booking/subscription auto-charge, via the Square Web Payments
// SDK: it tokenizes the card in-browser and we only ever send the one-time token.
export function CardOnFile() {
  const { data: method, isLoading } = usePaymentMethod()
  const removeCard = useRemoveCard()
  const saveCard = useSaveCard()
  const [adding, setAdding] = useState(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cardRef = useRef<SquareCard | null>(null)

  // Mount the Square card form once the user opens "Add a card".
  useEffect(() => {
    if (!adding) return
    let cancelled = false
    ;(async () => {
      try {
        if (!APP_ID || !LOCATION_ID) throw new Error("Card payments aren't configured.")
        await loadSquareSdk()
        if (cancelled || !window.Square) return
        const payments = window.Square.payments(APP_ID, LOCATION_ID)
        const card = await payments.card()
        await card.attach("#sq-card")
        if (cancelled) return card.destroy?.()
        cardRef.current = card
        setReady(true)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load the card form.")
      }
    })()
    return () => {
      cancelled = true
      cardRef.current?.destroy?.()
      cardRef.current = null
    }
  }, [adding])

  async function submit() {
    setError(null)
    if (!cardRef.current) return
    try {
      const result = await cardRef.current.tokenize()
      if (result.status !== "OK" || !result.token) {
        throw new Error(result.errors?.[0]?.message ?? "Card was declined.")
      }
      await saveCard.mutateAsync(result.token)
      setAdding(false)
    } catch (e) {
      const apiMsg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(apiMsg ?? (e instanceof Error ? e.message : "Couldn't save the card."))
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
      ) : adding ? (
        <div className="space-y-3">
          <div id="sq-card" className="rounded-xl border border-black/15 p-3 min-h-[52px]" />
          {error && <p className="text-xs text-[#d4754a]">{error}</p>}
          <div className="flex gap-2">
            <Button
              onClick={submit}
              disabled={!ready || saveCard.isPending}
              style={{ background: "#c96c83", border: "none", color: "#fff" }}
            >
              {saveCard.isPending ? "Saving…" : "Save card"}
            </Button>
            <Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <>
          <Button
            onClick={() => { setError(null); setReady(false); setAdding(true) }}
            style={{ background: "#c96c83", border: "none", color: "#fff" }}
          >
            Add a card
          </Button>
          {error && <p className="mt-3 text-xs text-[#d4754a]">{error}</p>}
        </>
      )}
    </div>
  )
}
