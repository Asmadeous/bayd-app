"use client"

import { useEffect, useId, useRef, useState } from "react"

import api from "@/lib/api"

type Suggestion = { description: string; place_id: string }

export type ResolvedAddress = {
  line1?: string | null
  city?: string | null
  province?: string | null
  postal_code?: string | null
  country?: string | null
  latitude?: number | null
  longitude?: number | null
}

// Street-address input with Google Places suggestions (proxied through our own
// /geo endpoints so the Maps key stays server-side). Typing queries suggestions
// (debounced); picking one resolves the full address and hands every part back
// via onResolved so the parent fills city/province/postal too. Degrades to a
// plain input if Places returns nothing - the user can always type freehand.
export function AddressAutocomplete({
  value,
  onChange,
  onResolved,
  placeholder = "Street address *",
  className = "",
}: {
  value: string
  onChange: (v: string) => void
  onResolved: (addr: ResolvedAddress) => void
  placeholder?: string
  className?: string
}) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [open, setOpen] = useState(false)
  const listId = useId()
  // One Places session token per lookup session (billing + result quality).
  const sessionRef = useRef<string>(cryptoRandom())
  const boxRef = useRef<HTMLDivElement>(null)
  // Skip the query fired by our own onChange right after a pick.
  const justPicked = useRef(false)

  // Debounced suggestion fetch. All setState here happens either after an async
  // network call or inside the debounce timeout - never synchronously during the
  // effect - so it can't trigger the cascading renders the rule guards against.
  useEffect(() => {
    if (justPicked.current) {
      justPicked.current = false
      return
    }
    const q = value.trim()
    let cancelled = false
    async function fetchSuggestions() {
      if (q.length < 3) {
        setSuggestions([])
        setOpen(false)
        return
      }
      try {
        const { data } = await api.get<{ suggestions: Suggestion[] }>("/geo/autocomplete", {
          params: { q, session: sessionRef.current },
        })
        if (cancelled) return
        const list = data.suggestions ?? []
        setSuggestions(list)
        setOpen(list.length > 0)
      } catch {
        if (!cancelled) setSuggestions([])
      }
    }
    const t = setTimeout(fetchSuggestions, q.length < 3 ? 0 : 300)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [value])

  // Close the dropdown on an outside click.
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDocClick)
    return () => document.removeEventListener("mousedown", onDocClick)
  }, [])

  async function pick(s: Suggestion) {
    justPicked.current = true
    onChange(s.description)
    setOpen(false)
    setSuggestions([])
    try {
      const { data } = await api.get<ResolvedAddress>("/geo/place_details", {
        params: { place_id: s.place_id, session: sessionRef.current },
      })
      // A resolved street line is cleaner than the full description.
      if (data.line1) {
        justPicked.current = true
        onChange(data.line1)
      }
      onResolved(data)
    } catch {
      // keep the typed description; the user can still complete the other fields
    }
    sessionRef.current = cryptoRandom() // new session for the next lookup
  }

  return (
    <div ref={boxRef} className="relative">
      <input
        className={className}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
      />
      {open && suggestions.length > 0 && (
        <ul
          id={listId}
          className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-black/10 bg-white py-1 shadow-lg"
        >
          {suggestions.map((s) => (
            <li key={s.place_id}>
              <button
                type="button"
                onClick={() => pick(s)}
                className="block w-full px-4 py-2.5 text-left text-sm text-[#101217] hover:bg-[#c96c83]/8"
              >
                {s.description}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function cryptoRandom() {
  try {
    return crypto.randomUUID()
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`
  }
}
