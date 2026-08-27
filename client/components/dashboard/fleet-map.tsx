"use client"

import { useEffect, useRef } from "react"
import type { Map as LeafletMap, Marker } from "leaflet"

import "leaflet/dist/leaflet.css"
import type { FleetPosition } from "@/lib/cable/use-fleet"

// Live fleet map (Leaflet + OpenStreetMap, no API key). One marker per technician
// with a valid position; on-shift techs are brand-pink, off-shift are grey. Pins
// move as poll + AdminFleetChannel updates arrive. Loaded client-only (Leaflet
// touches window) via next/dynamic in the page.
export function FleetMap({ techs }: { techs: FleetPosition[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const markersRef = useRef<Map<number, Marker>>(new Map())

  const located = techs.filter((t) => t.latitude != null && t.longitude != null)

  // Init map once.
  useEffect(() => {
    let cancelled = false
    const markers = markersRef.current
    ;(async () => {
      const L = await import("leaflet")
      if (cancelled || !containerRef.current || mapRef.current) return
      const map = L.map(containerRef.current, { attributionControl: false }).setView([43.65, -79.38], 10)
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map)
      mapRef.current = map
    })()
    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
      markers.clear()
    }
  }, [])

  // Sync markers to the current tech positions.
  useEffect(() => {
    ;(async () => {
      const L = await import("leaflet")
      const map = mapRef.current
      if (!map) return

      const seen = new Set<number>()
      for (const t of located) {
        seen.add(t.employee_profile_id)
        const color = t.on_shift ? "#c96c83" : "#8a8d93"
        const icon = L.divIcon({
          className: "",
          html: `<div style="display:flex;flex-direction:column;align-items:center">
            <span style="background:#101217;color:#fff;font:600 10px/1 sans-serif;padding:2px 5px;border-radius:4px;white-space:nowrap;margin-bottom:2px">${t.name ?? "Tech"}</span>
            <span style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.4)"></span>
          </div>`,
          iconSize: [60, 32],
          iconAnchor: [30, 32],
        })
        const existing = markersRef.current.get(t.employee_profile_id)
        if (existing) {
          existing.setLatLng([t.latitude, t.longitude])
          existing.setIcon(icon)
        } else {
          markersRef.current.set(t.employee_profile_id, L.marker([t.latitude, t.longitude], { icon }).addTo(map))
        }
      }

      // Drop markers for techs no longer present.
      for (const [id, marker] of markersRef.current) {
        if (!seen.has(id)) {
          marker.remove()
          markersRef.current.delete(id)
        }
      }

      // Fit all markers in view.
      if (located.length > 0) {
        const bounds = L.latLngBounds(located.map((t) => [t.latitude, t.longitude]))
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 })
      }
    })()
  }, [located])

  return <div ref={containerRef} className="h-[70vh] w-full overflow-hidden rounded-xl" />
}
