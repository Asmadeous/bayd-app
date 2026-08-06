"use client"

import { useEffect, useRef } from "react"

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? ""
const DEFAULT_CENTER = { lat: 43.6532, lng: -79.3832 } // Toronto

export interface StaffPoint {
  employee_profile_id: number
  name: string | null
  latitude: string | null
  longitude: string | null
  recorded_at: string | null
}

// ── Minimal Google Maps typings (avoids the @types/google.maps dependency) ──
interface LatLng { lat: number; lng: number }
interface GBounds { extend: (p: LatLng) => void }
interface GMarker { setMap: (m: unknown) => void; addListener: (e: string, cb: () => void) => void }
interface GInfoWindow { open: (opts: Record<string, unknown>) => void }
interface GMap {
  fitBounds: (b: GBounds) => void
  setCenter: (p: LatLng) => void
  setZoom: (z: number) => void
}
interface GMaps {
  Map: new (el: HTMLElement, opts: Record<string, unknown>) => GMap
  Marker: new (opts: Record<string, unknown>) => GMarker
  InfoWindow: new (opts: Record<string, unknown>) => GInfoWindow
  LatLngBounds: new () => GBounds
}
declare global {
  interface Window {
    google?: { maps: GMaps }
  }
}

function loadMaps(): Promise<void> {
  if (window.google?.maps) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-gmaps]")
    if (existing) {
      existing.addEventListener("load", () => resolve())
      existing.addEventListener("error", () => reject(new Error("Google Maps failed to load")))
      return
    }
    const s = document.createElement("script")
    s.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}`
    s.async = true
    s.defer = true
    s.dataset.gmaps = "1"
    s.onload = () => resolve()
    s.onerror = () => reject(new Error("Google Maps failed to load"))
    document.head.appendChild(s)
  })
}

export function StaffMap({ staff }: { staff: StaffPoint[] }) {
  const divRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<GMap | null>(null)
  const markersRef = useRef<GMarker[]>([])

  useEffect(() => {
    if (!MAPS_KEY || !divRef.current) return
    let cancelled = false

    loadMaps()
      .then(() => {
        if (cancelled || !window.google || !divRef.current) return
        const g = window.google.maps

        mapRef.current ||= new g.Map(divRef.current, {
          zoom: 11,
          center: DEFAULT_CENTER,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        })
        const map = mapRef.current

        markersRef.current.forEach((m) => m.setMap(null))
        markersRef.current = []

        const bounds = new g.LatLngBounds()
        const points = staff.filter((s) => s.latitude && s.longitude)

        points.forEach((s) => {
          const pos = { lat: Number(s.latitude), lng: Number(s.longitude) }
          const marker = new g.Marker({ position: pos, map, title: s.name ?? undefined })
          const info = new g.InfoWindow({
            content: `<div style="font-size:13px"><b>${s.name ?? "Staff"}</b><br/>${
              s.recorded_at ? new Date(s.recorded_at).toLocaleString() : "no fix"
            }</div>`,
          })
          marker.addListener("click", () => info.open({ map, anchor: marker }))
          markersRef.current.push(marker)
          bounds.extend(pos)
        })

        if (points.length === 1) {
          map.setCenter({ lat: Number(points[0].latitude), lng: Number(points[0].longitude) })
          map.setZoom(13)
        } else if (points.length > 1) {
          map.fitBounds(bounds)
        }
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [staff])

  if (!MAPS_KEY) return null

  return <div ref={divRef} className="h-[400px] w-full" />
}
