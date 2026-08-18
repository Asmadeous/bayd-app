"use client"

import { CalendarDays } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

type DatePickerProps = {
  className?: string
  min?: string
  onChange: (value: string) => void
  placeholder?: string
  value: string
}

export function DatePicker({ className, min, onChange, placeholder, value }: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const selectedDate = parseDate(value)
  const minDate = parseDate(min)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          aria-label={placeholder}
          className={cn(
            "h-11 justify-start gap-2 border-black/15 bg-white px-3 text-left text-sm font-semibold text-[#101217] hover:border-[#c96c83]/40 hover:bg-white",
            !value && "text-[#8a8d93]",
            className
          )}
          type="button"
          variant="outline"
        >
          <CalendarDays aria-hidden="true" className="size-4 text-[#c96c83]" />
          <span>{selectedDate ? formatDisplayDate(selectedDate) : placeholder ?? "Pick a date"}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto">
        <Calendar
          disabled={minDate ? { before: minDate } : undefined}
          mode="single"
          onSelect={(date) => {
            if (!date) return
            onChange(formatInputDate(date))
            setOpen(false)
          }}
          selected={selectedDate}
        />
      </PopoverContent>
    </Popover>
  )
}

function parseDate(value?: string): Date | undefined {
  if (!value) return undefined
  const [year, month, day] = value.split("-").map(Number)
  if (!year || !month || !day) return undefined
  return new Date(year, month - 1, day)
}

function formatInputDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function formatDisplayDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date)
}
