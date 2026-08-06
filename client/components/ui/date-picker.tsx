"use client"

import { cn } from "@/lib/utils"

type DatePickerProps = {
  className?: string
  min?: string
  onChange: (value: string) => void
  placeholder?: string
  value: string
}

export function DatePicker({ className, min, onChange, placeholder, value }: DatePickerProps) {
  return (
    <input
      aria-label={placeholder}
      className={cn(
        "h-11 border border-black/15 bg-white px-3 text-sm font-semibold text-[#101217] outline-none transition-colors placeholder:text-[#8a8d93] focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20",
        className
      )}
      min={min}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      type="date"
      value={value}
    />
  )
}
