"use client"

import { useMemo } from "react"
import dynamic from "next/dynamic"
import { useQuery } from "@tanstack/react-query"
import api from "@/lib/api"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { TutorialButton } from "@/components/dashboard/tutorial-button"
import { useFleet, type FleetPosition } from "@/lib/cable/use-fleet"
import { adminStaffLocationsSteps } from "@/lib/tours/admin-staff-locations-tour"

// Leaflet touches window; load the map client-only.
const FleetMap = dynamic(() => import("@/components/dashboard/fleet-map").then((m) => m.FleetMap), {
  ssr: false,
  loading: () => <div className="h-[70vh] w-full animate-pulse rounded-xl bg-black/5" />,
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

interface Response {
  data: StaffLocation[]
  map_image: string | null
}

export default function AdminStaffLocationsPage() {
  const { data } = useQuery<Response>({
    queryKey: ["admin-staff-locations"],
    queryFn: () => api.get<Response>("/admin/staff_locations").then((r) => r.data),
    refetchInterval: 30_000, // refresh locations every 30s
  })

  const rows = useMemo(() => data?.data ?? [], [data])
  const fuelTotal = rows.reduce((sum, r) => sum + Number(r.fuel_reimbursement), 0)

  // Seed the live fleet map from the poll (techs with a known position).
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
    [rows]
  )
  const fleet = useFleet(seed)

  return (
    <div className="space-y-6">
      <div data-tour="admin-staff-locations-header">
        <DashboardHeader title="Staff Locations" subtitle="Live positions, distance travelled, and fuel compensation" />
      </div>

      <div data-tour="admin-staff-locations-map">
        {fleet.length > 0 ? (
          // Live map (Leaflet/OpenStreetMap, no API key). Every tech with a known
          // position; pins move in real time via AdminFleetChannel + the 30s poll.
          <div className="overflow-hidden rounded-xl border border-black/8 bg-white">
            <FleetMap techs={fleet} />
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-black/15 bg-[#f4f1eb] px-5 py-10 text-center text-sm text-[#5f6268]">
            No live staff locations to map yet.
          </div>
        )}
      </div>

      <div className="rounded-xl border border-black/8 bg-white overflow-x-auto" data-tour="admin-staff-locations-table">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-black/8 text-left text-xs text-[#5f6268]">
              <th className="px-4 py-3 font-medium">Technician</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Last update</th>
              <th className="px-4 py-3 font-medium">Distance</th>
              <th className="px-4 py-3 font-medium">Fuel owed</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-[#5f6268]">No staff.</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.employee_profile_id} className="border-b border-black/5 last:border-0">
                  <td className="px-4 py-3 text-[#101217]">{r.name ?? `#${r.employee_profile_id}`}</td>
                  <td className="px-4 py-3">
                    <span className={r.on_shift ? "text-green-700" : "text-[#8a8d93]"}>
                      {r.on_shift ? "On shift" : "Off"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#5f6268]">
                    {r.recorded_at ? new Date(r.recorded_at).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-[#101217]">{Number(r.distance_km).toFixed(2)} km</td>
                  <td className="px-4 py-3 text-[#101217]">${Number(r.fuel_reimbursement).toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t border-black/10 font-semibold">
                <td className="px-4 py-3 text-[#101217]" colSpan={4}>Total fuel compensation</td>
                <td className="px-4 py-3 text-[#101217]">${fuelTotal.toFixed(2)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <TutorialButton steps={adminStaffLocationsSteps} pageKey="admin-staff-locations" />
    </div>
  )
}
