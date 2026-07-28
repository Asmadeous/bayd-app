"use client"

import { useQuery } from "@tanstack/react-query"
import api from "@/lib/api"

export interface CoverageResult {
  fsa: string
  covered: boolean
  unrestricted: boolean
  providers: string[]
}

// Extract the FSA (first 3 characters) the backend matches on.
export function toFsa(raw: string): string {
  return raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 3)
}

// Check whether a postal code's FSA is serviced. Fires once the first 3
// characters (the FSA) are entered.
export function useCoverage(rawPostal: string) {
  const fsa = toFsa(rawPostal)
  return useQuery({
    queryKey: ["coverage", fsa],
    queryFn: () => api.get<CoverageResult>("/coverage", { params: { postal_code: fsa } }).then((r) => r.data),
    enabled: fsa.length === 3,
    retry: false,
    staleTime: 5 * 60 * 1000,
  })
}
