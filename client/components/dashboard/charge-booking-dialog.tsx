"use client"

import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Check, CreditCard } from "lucide-react"

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
  DialogTrigger,
} from "@/components/ui/dialog"
import type { Booking } from "@/lib/hooks/use-bookings"
import { useChargeBooking, useRecordPayment } from "@/lib/hooks/use-employee"
import { CHARGE_METHODS, paymentMethodLabel } from "@/lib/payment-methods"
import { cn } from "@/lib/utils"

type ChargeMethod = (typeof CHARGE_METHODS)[number]["value"]

// Desktop staff dashboard: settle a booking's balance by the method the client
// is paying with. Card opens Square's card form for the tech to enter the
// client's card (never sent to the client); cash, Interac e-Transfer, and cheque
// are collected in person and marked paid with the method.
export function ChargeBookingDialog({ booking }: { booking: Booking }) {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [method, setMethod] = useState<ChargeMethod>("card")
  const [error, setError] = useState<string | null>(null)
  const charge = useChargeBooking()
  const record = useRecordPayment()
  const due = Number(booking.outstanding_balance)
  const busy = charge.isPending || record.isPending
  const chargeable = booking.status === "in_progress" || booking.status === "completed"

  if (due <= 0) {
    if (!booking.paid_methods?.length) return null
    return (
      <span className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-green-50 px-3 text-xs font-semibold text-green-800">
        <Check className="size-3.5" aria-hidden />
        Paid · {booking.paid_methods.map(paymentMethodLabel).join(" + ")}
      </span>
    )
  }
  if (!chargeable) return null

  async function submit() {
    setError(null)
    // The tech types the client's card into Square's form on this computer. Open
    // it in a new tab so the dashboard stays put; the tab is opened before the
    // request so the browser doesn't treat it as an unrequested popup. Focus
    // refetch is off app-wide, so refresh once when the tech comes back here.
    const cardTab = method === "card" ? window.open("", "_blank") : null
    try {
      if (method === "card") {
        const { url } = await charge.mutateAsync(booking.id)
        if (cardTab) {
          cardTab.location.href = url
          window.addEventListener(
            "focus",
            () => qc.invalidateQueries({ queryKey: ["employee-schedule"] }),
            { once: true },
          )
        } else {
          window.location.href = url
        }
        setOpen(false)
        return
      }
      await record.mutateAsync({ bookingId: booking.id, method })
      setOpen(false)
      toast({ title: "Marked paid", description: `$${due.toFixed(2)} by ${paymentMethodLabel(method)}.`, variant: "success" })
    } catch (e: unknown) {
      cardTab?.close()
      const d = e as { response?: { data?: { error?: string } } }
      setError(d?.response?.data?.error ?? "Couldn't complete the charge. Please try again.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="xs">
          <CreditCard className="size-3.5" aria-hidden /> Charge · ${due.toFixed(2)}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Charge ${due.toFixed(2)}</DialogTitle>
          <DialogDescription>
            How is the client paying for {booking.service?.name ?? "this booking"}?
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Payment method">
            {CHARGE_METHODS.map((m) => (
              <button
                key={m.value}
                type="button"
                role="radio"
                aria-checked={method === m.value}
                onClick={() => setMethod(m.value)}
                className={cn(
                  "rounded-lg border px-3 py-2.5 text-left transition-colors",
                  method === m.value ? "border-[#c96c83] bg-[#c96c83]/8" : "border-black/15 hover:bg-black/[0.03]",
                )}
              >
                <span className="block text-sm font-bold text-[#101217]">{m.label}</span>
                <span className="block text-xs text-[#5f6268]">{m.hint}</span>
              </button>
            ))}
          </div>
          {method !== "card" ? (
            <p className="mt-3 text-xs text-[#5f6268]">
              Only confirm once you have the payment. The booking is marked paid by {paymentMethodLabel(method)}.
            </p>
          ) : null}
          {error ? <p className="mt-3 text-sm font-medium text-red-700">{error}</p> : null}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
            Back
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? "Working…" : method === "card" ? "Enter card" : `Mark paid · ${paymentMethodLabel(method)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
