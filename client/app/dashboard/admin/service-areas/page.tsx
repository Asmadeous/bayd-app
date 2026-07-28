"use client"

import { useState } from "react"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Button } from "@/components/ui/button"
import { useAdminServiceAreas, useUpdateServiceArea, type ServiceArea } from "@/lib/hooks/use-admin"

// "M5V2T6" → "M5V 2T6" for display.
const pretty = (c: string) => (c.length === 6 ? `${c.slice(0, 3)} ${c.slice(3)}` : c)

// Split a textarea blob into candidate codes (backend does the real validation).
function parseCodes(text: string): string[] {
  return Array.from(
    new Set(
      text
        .split(/[\n,]+/)
        .map((s) => s.replace(/[^A-Za-z0-9]/g, "").toUpperCase())
        .filter((s) => s.length > 0)
    )
  )
}

export default function AdminServiceAreasPage() {
  const { data: areas = [], isLoading } = useAdminServiceAreas()
  const updateMutation = useUpdateServiceArea()
  const [editing, setEditing] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({ name: "", travel_fee: "", active: true, postal_codes: "" })

  function startEdit(area: ServiceArea) {
    setEditing(area.id)
    setEditForm({
      name: area.name,
      travel_fee: area.travel_fee,
      active: area.active,
      postal_codes: area.postal_codes.map(pretty).join("\n"),
    })
  }

  async function saveEdit() {
    if (!editing) return
    await updateMutation.mutateAsync({
      id: editing,
      name: editForm.name,
      travel_fee: editForm.travel_fee,
      active: editForm.active,
      postal_codes: parseCodes(editForm.postal_codes),
    })
    setEditing(null)
  }

  return (
    <div className="space-y-6">
      <DashboardHeader title="Service Areas" subtitle="Define the postal codes each zone serves" />

      <p className="rounded-xl border border-[#d4a843]/30 bg-[#d4a843]/10 px-4 py-3 text-xs text-[#5f6268]">
        <span className="font-semibold text-[#101217]">Coverage now lives on each provider.</span> Service coverage is matched by
        FSA (the first 3 characters of a postal code) against each technician&apos;s list on the{" "}
        <span className="font-semibold text-[#101217]">Employees</span> page. These zones are kept for naming and travel fees only.
      </p>

      {isLoading ? (
        <div className="text-sm text-[#5f6268]">Loading…</div>
      ) : (
        <div className="space-y-3">
          {areas.map((area) => (
            <div key={area.id} className="rounded-xl border border-black/8 bg-white px-5 py-4">
              {editing === area.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[#5f6268] mb-1">Name</label>
                      <input
                        value={editForm.name}
                        onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                        className="w-full h-9 border border-black/15 rounded-lg px-3 text-sm text-[#101217] focus:outline-none focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#5f6268] mb-1">Travel Fee ($)</label>
                      <input
                        value={editForm.travel_fee}
                        onChange={(e) => setEditForm((f) => ({ ...f, travel_fee: e.target.value }))}
                        className="w-full h-9 border border-black/15 rounded-lg px-3 text-sm text-[#101217] focus:outline-none focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#101217] mb-1.5">Postal codes served</label>
                    <textarea
                      value={editForm.postal_codes}
                      onChange={(e) => setEditForm((f) => ({ ...f, postal_codes: e.target.value }))}
                      rows={6}
                      placeholder={"M5V 2T6\nM5J 2X2\nM4Y 1G5"}
                      className="w-full border border-black/15 rounded-lg px-3 py-2 text-sm text-[#101217] font-mono focus:outline-none focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20"
                    />
                    <p className="text-xs text-[#8a8d93] mt-1.5">
                      One full postal code per line (or comma-separated). {parseCodes(editForm.postal_codes).length} code(s).
                      Invalid entries are dropped on save.
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
                <div>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-[#101217]">{area.name}</span>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={area.active ? { background: "#5a9e5a22", color: "#5a9e5a" } : { background: "#8a8d9322", color: "#8a8d93" }}
                        >
                          {area.active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <p className="text-xs text-[#5f6268] mt-0.5">
                        Travel fee: ${area.travel_fee}
                        {area.postal_code_count > 0
                          ? ` · serves ${area.postal_code_count} postal code${area.postal_code_count === 1 ? "" : "s"}`
                          : " · no codes set (unrestricted)"}
                      </p>
                    </div>
                    <Button size="xs" variant="outline" onClick={() => startEdit(area)}>
                      Edit
                    </Button>
                  </div>

                  {area.postal_codes.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {area.postal_codes.slice(0, 24).map((c) => (
                        <span key={c} className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-black/5 text-[#101217]">
                          {pretty(c)}
                        </span>
                      ))}
                      {area.postal_codes.length > 24 && (
                        <span className="text-[11px] text-[#8a8d93] px-1.5 py-0.5">+{area.postal_codes.length - 24} more</span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
