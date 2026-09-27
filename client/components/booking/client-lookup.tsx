"use client"

import { useRef, useState } from "react"
import { CheckCircle2, Search } from "lucide-react"

import { BubbleLoader } from "@/components/bubble-loader"
import { useStaffClientLookup, type StaffClient } from "@/lib/hooks/use-employee"

// Staff booking: find the client in our system by name, email or phone and fill
// the form with their details and saved address. No match means the tech types
// them in below.
export function ClientLookup({
  picked,
  onPick,
  onClear,
}: {
  picked: StaffClient | null
  onPick: (client: StaffClient) => void
  onClear: () => void
}) {
  const [text, setText] = useState("")
  const [query, setQuery] = useState("")
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lookup = useStaffClientLookup(query)
  const results = lookup.data ?? []

  function type(value: string) {
    setText(value)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setQuery(value.trim()), 300)
  }

  if (picked) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-emerald-300 bg-emerald-50 p-3">
        <CheckCircle2 className="size-5 shrink-0 text-emerald-700" aria-hidden />
        <p className="min-w-0 flex-1 text-sm font-semibold text-emerald-900">
          Existing client: {fullName(picked)}. Details filled in below.
        </p>
        <button type="button" onClick={onClear} className="text-sm font-bold text-emerald-800 underline-offset-2 hover:underline">
          Change
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#8a8d93]" aria-hidden />
        <input
          value={text}
          onChange={(e) => type(e.target.value)}
          placeholder="Search by name, email or phone"
          aria-label="Find an existing client"
          className="h-12 w-full rounded-xl border border-black/15 bg-white pl-11 pr-4 text-sm font-semibold text-[#101217] outline-none transition-colors placeholder:text-[#8a8d93] focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20"
        />
      </div>

      {query.length >= 3 ? (
        lookup.isFetching && results.length === 0 ? (
          <BubbleLoader className="py-4" />
        ) : results.length === 0 ? (
          <p className="mt-2 text-sm font-medium text-[#8a8d93]">No existing client matches. Enter their details below.</p>
        ) : (
          <ul className="mt-2 divide-y divide-black/5 overflow-hidden rounded-xl border border-black/10 bg-white">
            {results.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => {
                    onPick(c)
                    setText("")
                    setQuery("")
                  }}
                  className="block w-full px-4 py-3 text-left transition-colors active:bg-black/[0.03]"
                >
                  <span className="block text-sm font-bold">{fullName(c)}</span>
                  <span className="block truncate text-sm font-medium text-[#8a8d93]">
                    {[c.email, c.phone, c.address && `${c.address.line1}, ${c.address.city}`].filter(Boolean).join(" · ")}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )
      ) : (
        <p className="mt-2 text-sm font-medium text-[#8a8d93]">Type 3 or more letters to search. New client? Fill in the form below.</p>
      )}
    </div>
  )
}

export function fullName(c: StaffClient) {
  return [c.first_name, c.last_name].filter(Boolean).join(" ") || c.email || c.phone || "Client"
}
