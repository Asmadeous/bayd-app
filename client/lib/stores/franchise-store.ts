"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

import { DEFAULT_FRANCHISE, formatMoneyIn, type FranchiseConfig } from "@/lib/franchise-config"

export { DEFAULT_FRANCHISE, type FranchiseConfig }

// The franchise (branch) this device works in, and its public setup from
// GET /franchise. `slug` is sent as X-Franchise; null lets the API decide
// (the site's own domain, else the default franchise).
interface FranchiseStore {
  slug: string | null
  config: FranchiseConfig | null
  setSlug: (slug: string | null) => void
  setConfig: (config: FranchiseConfig) => void
}

export const useFranchiseStore = create<FranchiseStore>()(
  persist(
    (set) => ({
      slug: null,
      config: null,
      setSlug: (slug) => set({ slug }),
      setConfig: (config) => set({ config }),
    }),
    {
      name: "bayd-franchise",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? localStorage : { getItem: () => null, setItem: () => {}, removeItem: () => {} },
      ),
    },
  ),
)

export function franchiseConfig(): FranchiseConfig {
  return useFranchiseStore.getState().config ?? DEFAULT_FRANCHISE
}

// A config persisted before this field existed may lack it until the next fetch.
export function staffEmailDomain(): string {
  return franchiseConfig().staff_email_domain || DEFAULT_FRANCHISE.staff_email_domain
}

// Money in the franchise's currency and locale ("$40.00", "£40.00").
export function formatMoney(value: string | number | null | undefined, options: Intl.NumberFormatOptions = {}): string {
  return formatMoneyIn(franchiseConfig(), value, options)
}
