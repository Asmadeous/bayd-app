"use client"

import { useEffect, useMemo, useState } from "react"

import { getConsumer } from "@/lib/cable/consumer"

export interface FleetPosition {
  employee_profile_id: number
  name: string | null
  latitude: number
  longitude: number
  on_shift: boolean
  recorded_at: string
}

// Live fleet positions for the admin map. Merges the poll `initial` (baseline,
// keeps techs that aren't pinging live) with live AdminFleetChannel updates. A
// live ping for a tech overrides the polled position. Keyed by
// employee_profile_id.
export function useFleet(initial: FleetPosition[]): FleetPosition[] {
  const [live, setLive] = useState<Record<number, FleetPosition>>({})

  useEffect(() => {
    const consumer = getConsumer()
    if (!consumer) return

    const sub = consumer.subscriptions.create(
      { channel: "AdminFleetChannel" },
      {
        received(event: { type?: string } & FleetPosition) {
          if (event.type !== "fleet_position") return
          setLive((prev) => ({ ...prev, [event.employee_profile_id]: event }))
        },
      }
    )
    return () => {
      sub.unsubscribe()
    }
  }, [])

  // Merge is derived, not stored — no setState-in-effect. Live wins over poll.
  return useMemo(() => {
    const byId: Record<number, FleetPosition> = {}
    for (const p of initial) byId[p.employee_profile_id] = p
    for (const id of Object.keys(live)) byId[Number(id)] = live[Number(id)]
    return Object.values(byId)
  }, [initial, live])
}
