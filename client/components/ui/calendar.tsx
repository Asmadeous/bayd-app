"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker, type DayPickerProps } from "react-day-picker"

import { cn } from "@/lib/utils"

function Calendar({ className, classNames, showOutsideDays = true, ...props }: DayPickerProps) {
  return (
    <DayPicker
      className={cn("p-0", className)}
      classNames={{
        root: "w-fit",
        months: "flex flex-col gap-4",
        month: "space-y-3",
        month_caption: "flex h-8 items-center justify-center px-8 text-sm font-bold text-[#101217]",
        nav: "absolute inset-x-3 top-3 flex items-center justify-between",
        button_previous:
          "inline-flex size-7 items-center justify-center border border-black/10 bg-white text-[#5f6268] transition hover:border-[#c96c83]/40 hover:text-[#c96c83]",
        button_next:
          "inline-flex size-7 items-center justify-center border border-black/10 bg-white text-[#5f6268] transition hover:border-[#c96c83]/40 hover:text-[#c96c83]",
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "w-9 py-2 text-center text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[#8a8d93]",
        week: "mt-1 flex w-full",
        day: "size-9 p-0 text-center text-sm",
        day_button:
          "size-9 border border-transparent text-sm font-semibold text-[#101217] transition hover:border-[#c96c83]/30 hover:bg-[#c96c83]/10 focus-visible:border-[#c96c83] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#c96c83]/20",
        selected: "[&_button]:border-[#c96c83] [&_button]:bg-[#c96c83] [&_button]:text-white",
        today: "[&_button]:border-[#c96c83]/40 [&_button]:text-[#c96c83]",
        outside: "[&_button]:text-[#b7bac0]",
        disabled: "[&_button]:cursor-not-allowed [&_button]:opacity-35",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: iconClassName, ...iconProps }) =>
          orientation === "left" ? (
            <ChevronLeft aria-hidden="true" className={cn("size-4", iconClassName)} {...iconProps} />
          ) : (
            <ChevronRight aria-hidden="true" className={cn("size-4", iconClassName)} {...iconProps} />
          ),
      }}
      showOutsideDays={showOutsideDays}
      {...props}
    />
  )
}

export { Calendar }
