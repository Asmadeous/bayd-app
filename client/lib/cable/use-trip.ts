"use client"

import { useEffect, useState } from "react"

import { getConsumer } from "@/lib/cable/consumer"

export interface TripPosition {
  latitude: number
  longitude: number
  eta_minutes: number | null
}

// Subscribes to a booking's TripChannel (3f backend) and returns the tech's live
// position + ETA as it arrives on the job day. null until the first position.
export function useTrip(bookingId: number | null): TripPosition | null {
  const [position, setPosition] = useState<TripPosition | null>(null)

  useEffect(() => {
    if (!bookingId) return
    const consumer = getConsumer()
    if (!consumer) return

    const sub = consumer.subscriptions.create(
      { channel: "TripChannel", booking_id: bookingId },
      {
        received(event: { type?: string; latitude: number; longitude: number; eta_minutes: number | null }) {
          if (event.type === "position") {
            setPosition({ latitude: event.latitude, longitude: event.longitude, eta_minutes: event.eta_minutes })
          }
        },
      }
    )
    return () => {
      sub.unsubscribe()
    }
  }, [bookingId])

  return position
}
