"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Check } from "lucide-react"

import api from "@/lib/api"
import { cardClass, mutedClass } from "../app-theme"
import { SectionScreen } from "../section-screen"

interface Address {
  id: number
  label: string | null
  line1: string
  line2: string | null
  city: string
  province: string
  postal_code: string
  is_default: boolean
}

export default function AppAddressesScreen() {
  const qc = useQueryClient()
  const { data: addresses = [], isLoading } = useQuery<Address[]>({
    queryKey: ["addresses"],
    queryFn: () => api.get<Address[]>("/addresses").then((r) => r.data),
  })
  const setDefault = useMutation({
    mutationFn: (id: number) => api.post(`/addresses/${id}/set_default`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["addresses"] }),
  })

  return (
    <SectionScreen title="Addresses">
      {isLoading ? (
        <ListSkeleton />
      ) : addresses.length === 0 ? (
        <Empty text="No saved addresses yet." />
      ) : (
        <ul className="space-y-3 pb-6">
          {addresses.map((a) => (
            <li key={a.id} className={`p-4 ${cardClass}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {a.label && <p className="text-sm font-bold">{a.label}</p>}
                  <p className="text-sm">{a.line1}{a.line2 ? `, ${a.line2}` : ""}</p>
                  <p className={`text-sm ${mutedClass}`}>{a.city}, {a.province} {a.postal_code}</p>
                </div>
                {a.is_default ? (
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-[#c96c83]/12 px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-[#c96c83]">
                    <Check className="size-3" aria-hidden /> Default
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setDefault.mutate(a.id)}
                    disabled={setDefault.isPending}
                    className="shrink-0 rounded-full border border-black/15 px-3 py-1 text-xs font-semibold disabled:opacity-50"
                  >
                    Set default
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionScreen>
  )
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1].map((i) => (
        <div key={i} className="h-24 animate-pulse rounded-3xl bg-black/[0.04]" />
      ))}
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <p className={`rounded-3xl bg-white p-8 text-center text-sm shadow-sm ${mutedClass}`}>{text}</p>
}
