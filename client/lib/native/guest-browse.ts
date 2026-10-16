"use client"

import { useSyncExternalStore } from "react"
import { Capacitor } from "@capacitor/core"

// App Store guideline 5.1.1(v): only account features may require an account.
// Signed out, the whole app is open; these screens work as usual, and every
// other screen (bookings, chat, profile, orders...) asks the customer to sign
// in. Paying (checkout, booking, gift cards) also asks. iOS only, by request;
// Android and the web keep the full sign-in gate.
export const GUEST_ROUTES = ["/app/home", "/app/book", "/app/shop"]

export function guestBrowsingAllowed() {
  return Capacitor.getPlatform() === "ios"
}

const subscribe = () => () => {}

// The platform is known only in the browser; the static export renders as
// "not allowed" so hydration matches, then the real value takes over.
export function useGuestBrowsing() {
  return useSyncExternalStore(subscribe, guestBrowsingAllowed, () => false)
}
