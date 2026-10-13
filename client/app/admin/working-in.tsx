"use client"

import { useQueryClient } from "@tanstack/react-query"

import { useFranchises } from "@/lib/hooks/use-super"
import { useFranchiseStore } from "@/lib/stores/franchise-store"

// The super admin's "Working in" choice, the same one the web sidebar makes:
// sent as X-Franchise on every request. "All franchises" is view only (the API
// refuses changes until one is picked).
export function WorkingIn() {
  const { data: franchises = [] } = useFranchises()
  const slug = useFranchiseStore((s) => s.slug)
  const setSlug = useFranchiseStore((s) => s.setSlug)
  const queryClient = useQueryClient()

  function choose(next: string) {
    setSlug(next || null)
    void queryClient.invalidateQueries()
  }

  return (
    <label className="block">
      <span className="mb-1 block text-[0.7rem] font-bold uppercase tracking-[0.18em] text-[#14100F]/50">Working in</span>
      <select
        value={slug ?? ""}
        onChange={(e) => choose(e.target.value)}
        className="h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-base font-semibold text-[#14100F] outline-none focus:border-[#C96C83]"
      >
        <option value="">All franchises (view only)</option>
        {franchises.map((f) => (
          <option key={f.id} value={f.slug}>
            {f.name}
            {f.status === "live" ? "" : ` (${f.status})`}
          </option>
        ))}
      </select>
    </label>
  )
}
