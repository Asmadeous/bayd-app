"use client"

import { useEffect, useRef } from "react"
import type { LatLngBoundsExpression, Map as LeafletMap, Marker, Polyline } from "leaflet"

import "leaflet/dist/leaflet.css"

// A driving map for the TECH navigating to a job: their own live GPS pin
// (origin) + the client's fixed address (destination) + the road route between
// them. Same no-key stack as the customer TripMap (Leaflet + OpenStreetMap
// tiles); the route line comes from the public OSRM demo server, with a straight
// line as fallback. Loaded client-only via next/dynamic (Leaflet touches window).
export function StaffNavMap({
  meLat,
  meLng,
  destLat,
  destLng,
}: {
  meLat: number | null
  meLng: number | null
  destLat: number
  destLng: number
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const meMarkerRef = useRef<Marker | null>(null)
  const routeRef = useRef<Polyline | null>(null)
  const routeKeyRef = useRef<string | null>(null)

  // Init once, dropping the fixed destination (the client) pin.
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
          <span style="background:#101217;color:#fff;font:600 10px/1 sans-serif;padding:2px 5px;border-radius:4px;white-space:nowrap;margin-bottom:2px">Client</span>
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
      meMarkerRef.current = null
      routeRef.current = null
    }
  }, [destLat, destLng])

  // Move the tech pin as new GPS fixes arrive; keep both ends in view.
  useEffect(() => {
    if (meLat == null || meLng == null) return
    ;(async () => {
      const L = await import("leaflet")
      const map = mapRef.current
      if (!map) return

      const meIcon = L.divIcon({
        className: "",
        html: `<div style="display:flex;flex-direction:column;align-items:center">
          <span style="background:#c96c83;color:#fff;font:600 10px/1 sans-serif;padding:2px 5px;border-radius:4px;white-space:nowrap;margin-bottom:2px">You</span>
          <span style="width:16px;height:16px;border-radius:50%;background:#c96c83;border:3px solid #fff;box-shadow:0 0 0 2px rgba(201,108,131,.4),0 1px 3px rgba(0,0,0,.4)"></span>
        </div>`,
        iconSize: [40, 36],
        iconAnchor: [20, 36],
      })

      if (meMarkerRef.current) {
        meMarkerRef.current.setLatLng([meLat, meLng])
      } else {
        meMarkerRef.current = L.marker([meLat, meLng], { icon: meIcon }).addTo(map)
      }

      const bounds: LatLngBoundsExpression = [
        [meLat, meLng],
        [destLat, destLng],
      ]
      map.fitBounds(bounds, { padding: [70, 70], maxZoom: 16 })
    })()
  }, [meLat, meLng, destLat, destLng])

  // Fetch + draw the road route (OSRM). Refetch only when the origin moves
  // meaningfully (~rounded to 3 decimals, ≈100 m) so we don't hammer the server.
  useEffect(() => {
    if (meLat == null || meLng == null) return
    const key = `${meLat.toFixed(3)},${meLng.toFixed(3)}`
    if (key === routeKeyRef.current) return
    routeKeyRef.current = key

    let cancelled = false
    ;(async () => {
      const L = await import("leaflet")
      const map = mapRef.current
      if (!map) return

      let latlngs: [number, number][] = [
        [meLat, meLng],
        [destLat, destLng],
      ]
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${meLng},${meLat};${destLng},${destLat}?overview=full&geometries=geojson`
        const res = await fetch(url)
        if (res.ok) {
          const data = await res.json()
          const coords = data?.routes?.[0]?.geometry?.coordinates as [number, number][] | undefined
          if (coords?.length) latlngs = coords.map(([lng, lat]) => [lat, lng])
        }
      } catch {
        // fall back to the straight line already in latlngs
      }
      if (cancelled) return

      if (routeRef.current) {
        routeRef.current.setLatLngs(latlngs)
      } else {
        routeRef.current = L.polyline(latlngs, { color: "#c96c83", weight: 5, opacity: 0.85 }).addTo(map)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [meLat, meLng, destLat, destLng])

  return <div ref={containerRef} className="h-full w-full" />
}
