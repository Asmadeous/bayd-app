import { registerPlugin } from "@capacitor/core"

// Bridge to the native Square Mobile Payments SDK (Tap to Pay on the phone's own
// NFC, no external reader). Native implementations live in the staff app's
// projects: Android (SquarePosPlugin.kt) and iOS (SquarePosPlugin.swift/.m). All
// methods reject on the web / when the SDK isn't available, so callers must guard
// with isReady. iOS is written but must be built on a Mac (see docs).
//
// Flow:
//   1. authorize({ accessToken, locationId, environment }) — one-time per session,
//      wakes the SDK and links it to the merchant + location.
//   2. chargeTapToPay({ amountCents, currency, note }) — shows Square's tap sheet;
//      resolves with the completed Square paymentId, which the backend then
//      verifies + records (POST /employee/bookings/:id/pos_payment).
export interface SquarePosPlugin {
  // Whether Tap to Pay can run on this device (native + NFC + SDK present).
  isReady(): Promise<{ ready: boolean; reason?: string }>

  // Authorize the SDK for a merchant + location. accessToken is a short-lived
  // token minted by our server for the device, never a stored secret in the app.
  authorize(options: {
    accessToken: string
    locationId: string
    environment: "sandbox" | "production"
  }): Promise<{ authorized: boolean }>

  // Present the tap sheet and take a payment. Resolves once the card clears.
  chargeTapToPay(options: {
    amountCents: number
    currency?: string
    note?: string
  }): Promise<{ paymentId: string; status: string }>
}

export const SquarePos = registerPlugin<SquarePosPlugin>("SquarePos")
