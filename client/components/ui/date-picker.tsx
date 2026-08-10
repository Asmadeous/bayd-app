"use client"

import { useEffect, useRef, useState } from "react"
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"

type DatePickerProps = {
  className?: string
  min?: string
  onChange: (value: string) => void
  placeholder?: string
  value: string
}

function parseDate(value: string): Date | undefined {
  if (!value) return undefined
  const [year, month, day] = value.split("-").map(Number)
  return new Date(year, month - 1, day)
}

function toDateValue(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function formatDate(date: Date | undefined, placeholder: string): string {
  return date
    ? new Intl.DateTimeFormat("en-CA", {
        day: "numeric",
        month: "short",
        weekday: "short",
        year: "numeric",
      }).format(date)
    : placeholder
}

export function DatePicker({ className, min, onChange, placeholder = "Choose a date", value }: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const selected = parseDate(value)
  const minDate = parseDate(min ?? "")

  useEffect(() => {
    function closeOnOutsideClick(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }

    if (open) document.addEventListener("pointerdown", closeOnOutsideClick)
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick)
  }, [open])

  return (
    <div className="relative" ref={containerRef}>
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        className={cn(
          "flex h-11 w-full items-center justify-between border border-black/15 bg-white px-3 text-left text-sm font-semibold text-[#101217] outline-none transition-colors focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20",
          !selected && "text-[#8a8d93]",
          className,
        )}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className="inline-flex min-w-0 items-center gap-2">
          <CalendarDays aria-hidden="true" className="size-4 shrink-0 text-[#c96c83]" />
          <span className="truncate">{formatDate(selected, placeholder)}</span>
        </span>
        <span aria-hidden="true" className="text-xs text-[#8a8d93]">⌄</span>
      </button>

      {open ? (
        <div className="absolute left-0 top-[calc(100%+0.5rem)] z-30 rounded-none border border-black/10 bg-white p-3 shadow-xl shadow-black/10">
          <DayPicker
            aria-label={placeholder}
            classNames={{
              button_next: "grid size-8 place-items-center hover:bg-[#f4f1eb]",
              button_previous: "grid size-8 place-items-center hover:bg-[#f4f1eb]",
              caption_label: "text-sm font-black text-[#101217]",
              day: "size-9 p-0 text-sm",
              day_button: "size-9 font-semibold hover:bg-[#f4f1eb]",
              disabled: "text-[#c5c7cb]",
              month: "space-y-3",
              month_caption: "flex h-8 items-center justify-center",
              month_grid: "border-collapse",
              months: "flex",
              nav: "absolute inset-x-1 top-0 flex items-center justify-between",
              outside: "text-[#c5c7cb]",
              root: "relative",
              selected: "bg-[#c96c83] text-white hover:bg-[#c96c83]",
              today: "font-black text-[#c96c83]",
              weekday: "size-9 text-center text-[10px] font-bold uppercase text-[#8a8d93]",
              weekdays: "flex",
              week: "flex w-full",
            }}
            components={{
              Chevron: ({ orientation }) =>
                orientation === "left" ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />,
            }}
            disabled={minDate ? { before: minDate } : undefined}
            mode="single"
            month={selected ?? minDate}
            onSelect={(date) => {
              if (date) {
                onChange(toDateValue(date))
                setOpen(false)
              }
            }}
            selected={selected}
            showOutsideDays
          />
        </div>
      ) : null}
    </div>
  )
}
