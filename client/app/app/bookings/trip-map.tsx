"use client"

import { useEffect, useRef } from "react"
import type { LatLngBoundsExpression, Map as LeafletMap, Marker } from "leaflet"

import "leaflet/dist/leaflet.css"

// A single-trip live map for the customer: the assigned tech's moving pin plus
// the fixed destination (the service address). Same stack as the admin fleet map
// (Leaflet + OpenStreetMap tiles, no API key), but one tech and one destination.
// Loaded client-only via next/dynamic (Leaflet touches window).
export function TripMap({
  techLat,
  techLng,
  destLat,
  destLng,
}: {
  techLat: number | null
  techLng: number | null
  destLat: number
  destLng: number
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const techMarkerRef = useRef<Marker | null>(null)

  // Init the map once, dropping the fixed destination pin.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const L = await import("leaflet")
      if (cancelled || !containerRef.current || mapRef.current) return

      const map = L.map(containerRef.current, { attributionControl: false }).setView([destLat, destLng], 13)
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map)

      const destIcon = L.divIcon({
        className: "",
        html: `<div style="display:flex;flex-direction:column;align-items:center">
          <span style="background:#101217;color:#fff;font:600 10px/1 sans-serif;padding:2px 5px;border-radius:4px;white-space:nowrap;margin-bottom:2px">You</span>
          <span style="width:16px;height:16px;border-radius:50% 50% 50% 0;transform:rotate(45deg);background:#101217;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.4)"></span>
        </div>`,
        iconSize: [40, 36],
        iconAnchor: [20, 36],
      })
      L.marker([destLat, destLng], { icon: destIcon }).addTo(map)

      mapRef.current = map
    })()

    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
      techMarkerRef.current = null
    }
  }, [destLat, destLng])

  // Move the tech pin as new websocket positions arrive; keep both in view.
  useEffect(() => {
    if (techLat == null || techLng == null) return
    ;(async () => {
      const L = await import("leaflet")
      const map = mapRef.current
      if (!map) return

      const techIcon = L.divIcon({
        className: "",
        html: `<div style="display:flex;flex-direction:column;align-items:center">
          <span style="background:#c96c83;color:#fff;font:600 10px/1 sans-serif;padding:2px 5px;border-radius:4px;white-space:nowrap;margin-bottom:2px">Your tech</span>
          <span style="width:16px;height:16px;border-radius:50%;background:#c96c83;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.4)"></span>
        </div>`,
        iconSize: [60, 36],
        iconAnchor: [30, 36],
      })

      if (techMarkerRef.current) {
        techMarkerRef.current.setLatLng([techLat, techLng])
      } else {
        techMarkerRef.current = L.marker([techLat, techLng], { icon: techIcon }).addTo(map)
      }

      const bounds: LatLngBoundsExpression = [
        [techLat, techLng],
        [destLat, destLng],
      ]
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 })
    })()
  }, [techLat, techLng, destLat, destLng])

  return <div ref={containerRef} className="h-[45dvh] w-full overflow-hidden rounded-2xl" />
}
