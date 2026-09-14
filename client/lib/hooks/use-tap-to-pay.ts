"use client"

import { useCallback, useEffect, useState } from "react"
import { Capacitor } from "@capacitor/core"

import api from "@/lib/api"
import { SquarePos } from "@/lib/native/square-pos"

interface PosConfig {
  application_id: string
  location_id: string
  environment: "sandbox" | "production"
  configured: boolean
  // Returned only by the authenticated staff config endpoint, for SDK authorize().
  access_token?: string
}

// Drives an in-person Square Tap to Pay charge from the staff app:
//   1. checks the device can do it (native + NFC + SDK, and the server is set up),
//   2. authorizes the SDK once (server-provided location + environment),
//   3. takes the tap for `amountDollars`,
//   4. records the completed payment on the booking via the backend, which
//      re-verifies it with Square before marking it paid.
// Not available on the web or when Square POS isn't configured — `ready` is false
// and `charge` rejects, so the UI can fall back to the payment-link path.
export function useTapToPay() {
  const [ready, setReady] = useState(false)
  const [reason, setReason] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!Capacitor.isNativePlatform()) {
        if (!cancelled) setReason("Tap to Pay works in the app only.")
        return
      }
      try {
        const [{ ready: deviceReady, reason: deviceReason }, cfg] = await Promise.all([
          SquarePos.isReady(),
          api.get<PosConfig>("/employee/pos/config").then((r) => r.data),
        ])
        if (cancelled) return
        if (!deviceReady) setReason(deviceReason ?? "This device can't take taps.")
        else if (!cfg.configured) setReason("Tap to Pay isn't set up on this account yet.")
        else setReady(true)
      } catch {
        if (!cancelled) setReason("Couldn't check Tap to Pay availability.")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const charge = useCallback(
    async (bookingId: number, amountDollars: number): Promise<{ paid: boolean }> => {
      setBusy(true)
      try {
        if (!authorized) {
          // Server hands the device its merchant credentials at charge time so
          // the app never stores them.
          const cfg = (await api.get<PosConfig>("/employee/pos/config")).data
          await SquarePos.authorize({
            accessToken: cfg.access_token ?? "",
            locationId: cfg.location_id,
            environment: cfg.environment,
          })
          setAuthorized(true)
        }

        const { paymentId } = await SquarePos.chargeTapToPay({
          amountCents: Math.round(amountDollars * 100),
          currency: "CAD",
          note: `BKG-${bookingId}`,
        })

        await api.post(`/employee/bookings/${bookingId}/pos_payment`, {
          square_payment_id: paymentId,
          amount: amountDollars,
        })
        return { paid: true }
      } finally {
        setBusy(false)
      }
    },
    [authorized],
  )

  return { ready, reason, busy, charge }
}
