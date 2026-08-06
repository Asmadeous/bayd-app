import type { ButtonHTMLAttributes, ReactNode } from "react"

import { cn } from "@/lib/utils"

type DashboardToolbarProps = {
  children: ReactNode
  className?: string
}

type ToolbarSectionProps = {
  children: ReactNode
  className?: string
}

export function DashboardToolbar({ children, className }: DashboardToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border border-black/10 bg-white/70 px-4 py-3 shadow-sm shadow-black/[0.03] sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      {children}
    </div>
  )
}

export function ToolbarSection({ children, className }: ToolbarSectionProps) {
  return <div className={cn("flex flex-wrap items-center gap-2", className)}>{children}</div>
}

export function SegmentedControl({ children, className }: ToolbarSectionProps) {
  return (
    <div
      className={cn(
        "inline-flex flex-wrap items-center gap-1 border border-black/10 bg-white/75 p-1 shadow-sm shadow-black/[0.02]",
        className,
      )}
    >
      {children}
    </div>
  )
}

export function SegmentButton({
  active,
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      className={cn(
        "inline-flex h-8 items-center justify-center gap-1.5 px-3 text-[0.75rem] font-bold capitalize leading-none text-[#5f6268] transition-colors hover:bg-[#f4f1eb] hover:text-[#101217]",
        active &&
          "bg-[#c96c83] text-white shadow-sm shadow-[#c96c83]/20 hover:bg-[#c96c83] hover:text-white",
        className,
      )}
      type="button"
      {...props}
    >
      {children}
    </button>
  )
}
