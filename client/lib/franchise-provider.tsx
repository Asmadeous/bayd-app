"use client"

import { useEffect } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"

import api from "@/lib/api"
import { useFranchiseStore, type FranchiseConfig } from "@/lib/stores/franchise-store"

// Loads the franchise this device is in (chosen slug, else the site's own
// domain, else the default) so money, times and contacts follow its setup.
// When it changes, every query reloads so screens redraw in the new currency
// and zone.
export function FranchiseProvider() {
  const slug = useFranchiseStore((s) => s.slug)
  const setConfig = useFranchiseStore((s) => s.setConfig)
  const queryClient = useQueryClient()

  const { data } = useQuery<FranchiseConfig>({
    queryKey: ["franchise-config", slug],
    queryFn: () => api.get<FranchiseConfig>("/franchise").then((r) => r.data),
    staleTime: 10 * 60 * 1000,
  })

  useEffect(() => {
    if (!data) return
    const previous = useFranchiseStore.getState().config
    setConfig(data)
    const changed =
      previous != null &&
      (previous.slug !== data.slug || previous.currency !== data.currency || previous.time_zone !== data.time_zone)
    if (changed) void queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] !== "franchise-config" })
  }, [data, setConfig, queryClient])

  return null
}
