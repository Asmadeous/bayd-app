"use client"

import { useEffect, useRef, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/components/bayd-toast-provider"
import { Button } from "@/components/ui/button"
import api from "@/lib/api"

interface Candidate {
  employee_profile_id: number
  name: string | null
  on_shift: boolean
  distance_km: number | null
  location_source: string
  serves_area: boolean | null
  available: boolean
  current: boolean
}

// Admin control: reassign a booking to the nearest eligible technician.
export function ReassignControl({ bookingId }: { bookingId: number }) {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function handlePointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }

    document.addEventListener("mousedown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [open])

  const { data, isError, isLoading } = useQuery<{ candidates: Candidate[] }>({
    queryKey: ["booking-candidates", bookingId],
    queryFn: () =>
      api.get<{ candidates: Candidate[] }>(`/admin/bookings/${bookingId}/candidates`).then((r) => r.data),
    enabled: open,
    retry: false,
  })

  const assign = useMutation({
    mutationFn: (employee_profile_id: number) =>
      api.patch(`/admin/bookings/${bookingId}/assign`, { employee_profile_id }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-bookings"] })
      toast({ title: "Booking reassigned", variant: "success" })
      setOpen(false)
    },
    onError: (error: unknown) => {
      toast({
        title: "Booking not reassigned",
        description: getApiErrorMessage(error, "Could not reassign this booking."),
        variant: "error",
      })
    },
  })

  const candidates = data?.candidates ?? []

  return (
    <div className="relative" ref={rootRef}>
      <Button size="xs" variant="outline" onClick={() => setOpen((o) => !o)}>
        Reassign
      </Button>

      {open && (
        <div className="absolute right-0 z-20 mt-1 w-72 rounded-xl border border-black/10 bg-white p-2 shadow-lg">
          <p className="px-2 py-1 text-xs font-semibold text-[#5f6268]">Nearest eligible staff</p>

          {isLoading ? (
            <p className="px-2 py-2 text-xs text-[#8a8d93]">Loading…</p>
          ) : isError ? (
            <p className="px-2 py-2 text-xs font-semibold text-[#b75c68]">Couldn&apos;t load eligible staff.</p>
          ) : candidates.length === 0 ? (
            <p className="px-2 py-2 text-xs text-[#8a8d93]">No eligible staff for this service.</p>
          ) : (
            candidates.map((c) => (
              <div key={c.employee_profile_id} className="flex items-center justify-between gap-2 px-2 py-1.5">
                <div className="min-w-0">
                  <p className="truncate text-sm text-[#101217]">
                    {c.name ?? `#${c.employee_profile_id}`}
                    {c.current ? <span className="text-[#8a8d93]"> · current</span> : null}
                  </p>
                  <p className="text-[11px] text-[#8a8d93]">
                    {c.distance_km != null ? `${c.distance_km} km` : "no location"} · {c.location_source}
                    {c.on_shift ? " · on shift" : " · off"}
                    {c.available ? "" : " · busy"}
                    {c.serves_area === false ? " · out of area" : ""}
                  </p>
                </div>
                <Button
                  size="xs" variant="outline"
                  disabled={assign.isPending || c.current || !c.available}
                  onClick={() => assign.mutate(c.employee_profile_id)}
                >
                  Assign
                </Button>
              </div>
            ))
          )}

          {assign.isError ? (
            <p className="px-2 py-1 text-xs font-semibold text-[#b75c68]">Couldn&apos;t assign this booking.</p>
          ) : null}
        </div>
      )}
    </div>
  )
}

function getApiErrorMessage(error: unknown, fallback: string) {
  const data = (error as { response?: { data?: { error?: string; errors?: string[] } } })?.response?.data
  return data?.error ?? data?.errors?.join(", ") ?? fallback
}
