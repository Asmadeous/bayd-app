"use client"

import { useEffect, useRef } from "react"
import type { Map as LeafletMap, Marker } from "leaflet"

import "leaflet/dist/leaflet.css"

export interface TripMapProps {
  tech: { lat: number; lng: number } | null
  destination: { lat: number; lng: number }
}

// Live tracking map (Leaflet + OpenStreetMap, no API key). A pulsing dot marks the
// technician's live position and a pin marks the customer's address; the view
// auto-fits both. Leaflet touches `window`, so this component is loaded client-only
// via next/dynamic (see trip-map-panel). Custom DivIcons keep it on-brand.
export function TripMap({ tech, destination }: TripMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const techMarkerRef = useRef<Marker | null>(null)

  // Init the map + destination pin once.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const L = await import("leaflet")
      if (cancelled || !containerRef.current || mapRef.current) return

      const map = L.map(containerRef.current, { zoomControl: false, attributionControl: false }).setView(
        [destination.lat, destination.lng],
        14
      )
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map)

      const destIcon = L.divIcon({
        className: "",
        html: `<div style="width:18px;height:18px;border-radius:50% 50% 50% 0;background:#101217;transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 18],
      })
      L.marker([destination.lat, destination.lng], { icon: destIcon }).addTo(map)

      mapRef.current = map
    })()

    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
      techMarkerRef.current = null
    }
    // destination is fixed for a booking; init once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Move (or create) the tech marker as live positions arrive, and keep both in view.
  useEffect(() => {
    if (!tech) return
    ;(async () => {
      const L = await import("leaflet")
      const map = mapRef.current
      if (!map) return

      if (!techMarkerRef.current) {
        const techIcon = L.divIcon({
          className: "",
          html: `<div class="bayd-pulse" style="width:16px;height:16px;border-radius:50%;background:#c96c83;border:3px solid #fff;box-shadow:0 0 0 rgba(201,108,131,.6)"></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        })
        techMarkerRef.current = L.marker([tech.lat, tech.lng], { icon: techIcon }).addTo(map)
      } else {
        techMarkerRef.current.setLatLng([tech.lat, tech.lng])
      }

      const bounds = L.latLngBounds([tech.lat, tech.lng], [destination.lat, destination.lng])
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 })
    })()
  }, [tech, destination])

  return (
    <>
      <div ref={containerRef} className="h-56 w-full overflow-hidden rounded-xl" />
      <style jsx global>{`
        .bayd-pulse {
          animation: bayd-pulse 1.8s ease-out infinite;
        }
        @keyframes bayd-pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(201, 108, 131, 0.5);
          }
          70% {
            box-shadow: 0 0 0 14px rgba(201, 108, 131, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(201, 108, 131, 0);
          }
        }
      `}</style>
    </>
  )
}
