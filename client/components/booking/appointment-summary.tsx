"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { CalendarDays, ChevronDown, Pencil, Sparkles, X } from "lucide-react"

import { cn } from "@/lib/utils"

export type SummaryLine = { name: string; detail?: string; price: number | null }

// The running "Appointment summary" beside the booking steps, like Square's.
// Prices are tax-inclusive; the invoice breaks out HST.
export function AppointmentSummary({
  when,
  lines,
  onEditService,
  className,
  bare = false,
}: {
  when?: { date: string; time: string } | null
  lines: SummaryLine[]
  onEditService?: () => void
  className?: string
  // Content only (no card or heading), for the phone sheet which has its own.
  bare?: boolean
}) {
  const quote = lines.some((l) => l.price == null)
  const total = lines.reduce((sum, l) => sum + (l.price ?? 0), 0)

  return (
    <aside className={cn(!bare && "rounded-2xl border border-black/10 bg-white p-5", className)} aria-label="Appointment summary">
      {bare ? null : <p className="text-base font-black tracking-tight">Appointment summary</p>}

      {lines.length === 0 ? (
        <p className="mt-3 text-sm font-medium text-[#8a8d93]">No services added yet</p>
      ) : (
        <>
          {when ? (
            <div className="mt-4 flex items-start gap-3 border-b border-black/10 pb-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-black/[0.05]">
                <CalendarDays className="size-4" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-bold">{when.date}</p>
                <p className="text-xs font-medium text-[#8a8d93]">{when.time}</p>
              </div>
            </div>
          ) : null}

          <ul className="mt-4 space-y-3">
            {lines.map((line, i) => (
              <li key={`${line.name}-${i}`} className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#c96c83]/10 text-[#c96c83]">
                  <Sparkles className="size-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{line.name}</p>
                  {line.detail ? <p className="text-xs font-medium text-[#8a8d93]">{line.detail}</p> : null}
                </div>
                <span className="text-sm font-bold">{line.price == null ? "Quote" : `$${line.price.toFixed(2)}`}</span>
                {i === 0 && onEditService ? (
                  <button
                    type="button"
                    onClick={onEditService}
                    aria-label="Change service"
                    className="-mr-1 grid size-7 place-items-center rounded-full text-[#8a8d93] hover:bg-black/[0.05] hover:text-[#101217]"
                  >
                    <Pencil className="size-3.5" aria-hidden />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>

          <div className="mt-4 flex items-center justify-between border-t border-black/10 pt-4">
            <span className="text-sm font-bold">Total</span>
            <span className="text-base font-black">{quote ? "Quote" : `$${total.toFixed(2)}`}</span>
          </div>
          <p className="mt-1 text-xs font-medium text-[#8a8d93]">Taxes included.</p>
        </>
      )}
    </aside>
  )
}

// Phones: the summary as a one-line bar pinned above Continue ("Pedicure +
// Manicure · Sat 2:15 PM · $90.00"). Tapping it opens the full summary as a
// bottom sheet over a dimmed page; tap outside, Done, or Escape to close.
export function SummaryBar({
  when,
  lines,
  onEditService,
  className,
}: {
  when?: { date: string; time: string } | null
  lines: SummaryLine[]
  onEditService?: () => void
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const quote = lines.some((l) => l.price == null)
  const total = lines.reduce((sum, l) => sum + (l.price ?? 0), 0)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="flex w-full items-center gap-3 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-left transition-transform active:scale-[0.99]"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold">{lines.map((l) => l.name).join(" + ")}</span>
          <span className="block truncate text-xs font-medium text-[#8a8d93]">
            {when ? `${when.date} · ${when.time}` : "No time picked yet"}
          </span>
        </span>
        <span className="text-sm font-black">{quote ? "Quote" : `$${total.toFixed(2)}`}</span>
        <ChevronDown className="size-4 shrink-0 rotate-180" aria-hidden />
      </button>

      {/* Portalled: the pinned bar's backdrop blur would otherwise trap a fixed
          sheet inside it. */}
      {open
        ? createPortal(
            <div className="fixed inset-0 z-[60] flex items-end" role="dialog" aria-modal="true" aria-label="Appointment summary">
              <button
                type="button"
                aria-label="Close summary"
                onClick={() => setOpen(false)}
                className="absolute inset-0 bg-[#14100F]/45 animate-in fade-in"
              />
              <div className="relative max-h-[80dvh] w-full overflow-y-auto rounded-t-3xl bg-white px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_40px_-12px_rgba(20,16,15,0.35)] animate-in slide-in-from-bottom">
                <span aria-hidden className="mx-auto block h-1.5 w-10 rounded-full bg-black/15" />
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-lg font-black tracking-tight">Appointment summary</p>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Close"
                    className="grid size-9 place-items-center rounded-full bg-black/[0.05]"
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                </div>
                <AppointmentSummary
                  bare
                  when={when}
                  lines={lines}
                  onEditService={onEditService ? () => { setOpen(false); onEditService() } : undefined}
                />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="mt-5 h-12 w-full rounded-xl bg-[#101217] text-sm font-bold uppercase tracking-wide text-white"
                >
                  Done
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
