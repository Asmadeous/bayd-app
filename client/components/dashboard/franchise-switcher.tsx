"use client"

import { useQueryClient } from "@tanstack/react-query"

import { useFranchises } from "@/lib/hooks/use-super"
import { useFranchiseStore } from "@/lib/stores/franchise-store"

// A super admin works in one franchise (every admin page shows its data) or
// across all of them. The choice is sent as X-Franchise on every request.
export function FranchiseSwitcher() {
  const { data: franchises = [] } = useFranchises()
  const slug = useFranchiseStore((s) => s.slug)
  const setSlug = useFranchiseStore((s) => s.setSlug)
  const queryClient = useQueryClient()

  function choose(next: string) {
    setSlug(next || null)
    void queryClient.invalidateQueries()
  }

  return (
    <label className="block border-b border-white/10 px-4 py-3">
      <span className="mb-1 block text-[0.65rem] font-bold uppercase tracking-[0.22em] text-[#f0c8d3]/55">Working in</span>
      <select
        value={slug ?? ""}
        onChange={(e) => choose(e.target.value)}
        className="h-9 w-full border border-white/15 bg-[#1b1d23] px-2 text-sm font-semibold text-white outline-none focus:border-[#c96c83]"
      >
        <option value="">All franchises</option>
        {franchises.map((f) => (
          <option key={f.id} value={f.slug}>{f.name}{f.status === "live" ? "" : ` (${f.status})`}</option>
        ))}
      </select>
    </label>
  )
}
