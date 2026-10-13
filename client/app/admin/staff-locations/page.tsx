"use client"

import { useMemo } from "react"
import dynamic from "next/dynamic"
import { useQuery } from "@tanstack/react-query"

import api from "@/lib/api"
import { formatBookingDateTime } from "@/lib/booking-time"
import { useFleet, type FleetPosition } from "@/lib/cable/use-fleet"
import { formatMoney } from "@/lib/stores/franchise-store"
import { AdminHeader } from "../admin-header"
import { adminScreenClass, cardClass, mutedClass } from "../admin-theme"

// Leaflet touches window; load the map client-only.
const FleetMap = dynamic(() => import("@/components/dashboard/fleet-map").then((m) => m.FleetMap), {
  ssr: false,
  loading: () => <div className="h-[45vh] w-full animate-pulse rounded-2xl bg-black/5" />,
})

interface StaffLocation {
  employee_profile_id: number
  name: string | null
  on_shift: boolean
  latitude: string | null
  longitude: string | null
  recorded_at: string | null
  distance_km: number
  fuel_reimbursement: number
}

// The web Staff Locations page: the live fleet map, then each tech's last
// update, distance and fuel owed.
export default function AdminStaffLocationsScreen() {
  const { data } = useQuery<{ data: StaffLocation[] }>({
    queryKey: ["admin-staff-locations"],
    queryFn: () => api.get<{ data: StaffLocation[] }>("/admin/staff_locations").then((r) => r.data),
    refetchInterval: 30_000,
  })
  const rows = useMemo(() => data?.data ?? [], [data])
  const fuelTotal = rows.reduce((sum, r) => sum + Number(r.fuel_reimbursement), 0)

  const seed: FleetPosition[] = useMemo(
    () =>
      rows
        .filter((r) => r.latitude != null && r.longitude != null)
        .map((r) => ({
          employee_profile_id: r.employee_profile_id,
          name: r.name,
          latitude: Number(r.latitude),
          longitude: Number(r.longitude),
          on_shift: r.on_shift,
          recorded_at: r.recorded_at ?? "",
        })),
    [rows],
  )
  const fleet = useFleet(seed)

  return (
    <div className={adminScreenClass}>
      <AdminHeader title="Staff map" />
      <p className={`px-5 pb-3 text-sm ${mutedClass}`}>Live positions, distance travelled, and fuel compensation.</p>
      <div className="space-y-3 px-5">
        {fleet.length > 0 ? (
          <div className={`${cardClass} overflow-hidden p-0`}>
            <FleetMap techs={fleet} heightClass="h-[45vh]" />
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-black/15 px-5 py-10 text-center text-sm text-[#14100F]/65">No live staff locations to map yet.</p>
        )}

        {rows.length === 0 ? (
          <p className={`text-sm ${mutedClass}`}>No staff.</p>
        ) : (
          <>
            {rows.map((r) => (
              <section key={r.employee_profile_id} className={`${cardClass} p-4`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-base font-bold">{r.name ?? `#${r.employee_profile_id}`}</span>
                  <span className={`text-sm font-semibold ${r.on_shift ? "text-green-700" : mutedClass}`}>{r.on_shift ? "On shift" : "Off"}</span>
                </div>
                <p className={`mt-1 text-xs ${mutedClass}`}>Last update {r.recorded_at ? formatBookingDateTime(r.recorded_at) : "-"}</p>
                <div className="mt-2 flex justify-between text-sm">
                  <span>{Number(r.distance_km).toFixed(2)} km</span>
                  <span className="font-bold">{formatMoney(Number(r.fuel_reimbursement))} fuel owed</span>
                </div>
              </section>
            ))}
            <section className={`${cardClass} flex items-center justify-between p-4`}>
              <span className="text-sm font-bold">Total fuel compensation</span>
              <span className="text-base font-black text-[#C96C83]">{formatMoney(fuelTotal)}</span>
            </section>
          </>
        )}
      </div>
    </div>
  )
}
