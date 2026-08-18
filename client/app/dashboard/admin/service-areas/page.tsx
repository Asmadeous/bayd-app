"use client"

import { useState } from "react"
import { MapPin } from "lucide-react"

import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardPage } from "@/components/dashboard/dashboard-page"
import { DashboardPanel } from "@/components/dashboard/dashboard-panel"
import { EmptyState } from "@/components/dashboard/empty-state"
import { StatusBadgeFor } from "@/components/dashboard/status-badge"
import { TutorialButton } from "@/components/dashboard/tutorial-button"
import { Button } from "@/components/ui/button"
import { useAdminServiceAreas, useUpdateServiceArea } from "@/lib/hooks/use-admin"
import { adminServiceAreasSteps } from "@/lib/tours/admin-service-areas-tour"

const fieldClass =
  "h-9 w-full border border-black/15 bg-white px-3 text-sm font-semibold text-[#101217] outline-none transition-colors focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20"
const labelClass = "mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-[#6b6f76]"

export default function AdminServiceAreasPage() {
  const { data: areas = [], isLoading } = useAdminServiceAreas()
  const updateMutation = useUpdateServiceArea()
  const [editing, setEditing] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({
    name: "",
    travel_fee: "",
    active: true,
    center_latitude: "",
    center_longitude: "",
    radius_km: "",
  })

  function startEdit(area: (typeof areas)[0]) {
    setEditing(area.id)
    setEditForm({
      name: area.name,
      travel_fee: area.travel_fee,
      active: area.active,
      center_latitude: area.center_latitude ?? "",
      center_longitude: area.center_longitude ?? "",
      radius_km: area.radius_meters != null ? String(area.radius_meters / 1000) : "",
    })
  }

  async function saveEdit() {
    if (!editing) return
    await updateMutation.mutateAsync({
      id: editing,
      name: editForm.name,
      travel_fee: editForm.travel_fee,
      active: editForm.active,
      center_latitude: editForm.center_latitude.trim() || null,
      center_longitude: editForm.center_longitude.trim() || null,
      radius_meters: editForm.radius_km.trim() ? Math.round(Number(editForm.radius_km) * 1000) : null,
    })
    setEditing(null)
  }

  return (
    <DashboardPage maxWidth="wide">
      <div data-tour="admin-service-areas-header">
        <DashboardHeader title="Service Areas" subtitle="Configure GTA service zones and travel fees." />
      </div>

      {isLoading ? (
        <DashboardPanel>
          <p className="text-sm text-[#5f6268]">Loading service areas...</p>
        </DashboardPanel>
      ) : areas.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="No service areas found"
          description="Configured service zones will appear here."
        />
      ) : (
        <div className="space-y-3" data-tour="admin-service-areas-list">
          {areas.map((area) => (
            <DashboardPanel key={area.id}>
              {editing === area.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Name</label>
                      <input
                        className={fieldClass}
                        value={editForm.name}
                        onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Travel Fee ($)</label>
                      <input
                        className={fieldClass}
                        value={editForm.travel_fee}
                        onChange={(e) => setEditForm((f) => ({ ...f, travel_fee: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#101217] mb-1.5">Bookable area (circular zone)</p>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className={labelClass}>Center latitude</label>
                        <input
                          className={fieldClass}
                          value={editForm.center_latitude}
                          onChange={(e) => setEditForm((f) => ({ ...f, center_latitude: e.target.value }))}
                          placeholder="43.6532"
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Center longitude</label>
                        <input
                          className={fieldClass}
                          value={editForm.center_longitude}
                          onChange={(e) => setEditForm((f) => ({ ...f, center_longitude: e.target.value }))}
                          placeholder="-79.3832"
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Radius (km)</label>
                        <input
                          className={fieldClass}
                          value={editForm.radius_km}
                          onChange={(e) => setEditForm((f) => ({ ...f, radius_km: e.target.value }))}
                          placeholder="25"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-[#8a8d93] mt-1.5">
                      Leave blank to serve everywhere. Addresses outside every active zone can&apos;t book.
                    </p>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer text-sm text-[#101217]">
                    <input
                      type="checkbox"
                      checked={editForm.active}
                      onChange={(e) => setEditForm((f) => ({ ...f, active: e.target.checked }))}
                      className="accent-[#c96c83]"
                    />
                    Active
                  </label>
                  <div className="flex gap-2">
                    <Button size="sm" disabled={updateMutation.isPending} onClick={saveEdit} style={{ background: "#c96c83", border: "none", color: "#fff" }}>
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-extrabold text-[#101217]">{area.name}</span>
                      <StatusBadgeFor status={area.active ? "active" : "inactive"} />
                    </div>
                    <p className="text-xs text-[#5f6268] mt-0.5">
                      Travel fee: ${area.travel_fee}
                      {area.radius_meters != null && area.center_latitude
                        ? ` · serves ${(area.radius_meters / 1000).toFixed(0)} km around ${Number(area.center_latitude).toFixed(3)}, ${Number(area.center_longitude).toFixed(3)}`
                        : " · no boundary set (serves everywhere)"}
                    </p>
                  </div>
                  <Button size="xs" variant="outline" onClick={() => startEdit(area)}>
                    Edit
                  </Button>
                </div>
              )}
            </DashboardPanel>
          ))}
        </div>
      )}

      <TutorialButton steps={adminServiceAreasSteps} pageKey="admin-service-areas" />
    </DashboardPage>
  )
}
