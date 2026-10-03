"use client"

import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Copy, ExternalLink } from "lucide-react"

import { useToast } from "@/components/bayd-toast-provider"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import api from "@/lib/api"
import type { Booking } from "@/lib/hooks/use-bookings"
import { formatMoney } from "@/lib/stores/franchise-store"

type Mode = "link" | "charge"

function apiError(e: unknown) {
  const data = (e as { response?: { data?: { error?: string } } })?.response?.data
  return data?.error ?? "Please try again."
}

// Collect a booking's balance from the dashboard: send the client a secure
// Square payment link, or charge the card they saved on the website.
export function CollectPaymentButton({ booking }: { booking: Booking }) {
  const { toast } = useToast()
  const qc = useQueryClient()
  const balance = Number(booking.outstanding_balance ?? 0)
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState(balance.toFixed(2))
  const [notify, setNotify] = useState(true)
  const [link, setLink] = useState<string | null>(null)
  const [confirmCharge, setConfirmCharge] = useState(false)

  const collect = useMutation({
    mutationFn: (mode: Mode) =>
      api
        .post<{ mode: string; url: string | null }>(`/admin/bookings/${booking.id}/payment_link`, {
          mode,
          amount,
          notify: mode === "link" && notify,
        })
        .then((r) => r.data),
    onSuccess: (data, mode) => {
      qc.invalidateQueries({ queryKey: ["admin-bookings"] })
      if (mode === "link" && data.url) {
        setLink(data.url)
        toast({ title: notify ? "Payment link sent to the client" : "Payment link ready", variant: "success" })
      } else {
        toast({ title: "Card charged", description: `${formatMoney(Number(amount))} was charged.`, variant: "success" })
        close()
      }
    },
    onError: (e) => toast({ title: "Payment not started", description: apiError(e), variant: "error" }),
  })

  function close() {
    setOpen(false)
    setLink(null)
    setConfirmCharge(false)
    setAmount(balance.toFixed(2))
  }

  if (booking.status === "cancelled" || balance <= 0) return null

  const validAmount = Number(amount) > 0

  return (
    <>
      <Button size="xs" variant="outline" onClick={() => setOpen(true)}>
        Collect {formatMoney(balance)}
      </Button>

      <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
        <DialogContent className="max-w-lg">
          <DialogHeader className="pr-14">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a36f4d]">Payment</p>
            <DialogTitle>Collect payment</DialogTitle>
            <DialogDescription>
              {booking.customer_name || "The client"} owes {formatMoney(balance)} for this booking.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            {link ? (
              <div className="space-y-2">
                <p className="text-sm text-[#101217]">
                  {notify ? "The client was sent this link by text and in the app." : "Share this link with the client:"}
                </p>
                <div className="flex items-center gap-2 border border-black/10 bg-[#fbfaf7] px-3 py-2">
                  <span className="min-w-0 flex-1 truncate text-sm">{link}</span>
                  <button
                    type="button"
                    aria-label="Copy link"
                    onClick={() => {
                      navigator.clipboard?.writeText(link)
                      toast({ title: "Link copied", variant: "success" })
                    }}
                    className="p-1 text-[#5f6268]"
                  >
                    <Copy className="size-4" />
                  </button>
                  <a href={link} target="_blank" rel="noreferrer" aria-label="Open link" className="p-1 text-[#5f6268]">
                    <ExternalLink className="size-4" />
                  </a>
                </div>
              </div>
            ) : (
              <>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-[#6b6f76]">Amount (CAD)</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value)
                      setConfirmCharge(false)
                    }}
                    className="h-10 w-40 border border-black/15 bg-white px-3 text-sm outline-none focus:border-[#c96c83]"
                  />
                </label>
                <label className="flex items-center gap-2 text-sm text-[#101217]">
                  <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="accent-[#c96c83]" />
                  Text the link to the client and notify them in the app
                </label>
                {confirmCharge ? (
                  <p className="border border-[#b75c68]/25 bg-[#fff5f6] px-3 py-2 text-sm font-semibold text-[#8f3f4b]">
                    Charge {formatMoney(Number(amount))} to the client&apos;s saved card now? Press Charge again to confirm.
                  </p>
                ) : null}
              </>
            )}
          </DialogBody>
          <DialogFooter>
            {link ? (
              <Button size="sm" onClick={close}>
                Done
              </Button>
            ) : (
              <>
                <Button size="sm" disabled={!validAmount || collect.isPending} onClick={() => collect.mutate("link")}>
                  {notify ? "Send payment link" : "Create payment link"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!validAmount || collect.isPending}
                  onClick={() => (confirmCharge ? collect.mutate("charge") : setConfirmCharge(true))}
                >
                  Charge saved card
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
