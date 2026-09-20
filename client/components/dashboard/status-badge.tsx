import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type StatusTone = "rose" | "gold" | "green" | "gray" | "red" | "dark"

type StatusBadgeProps = {
  children: ReactNode
  tone?: StatusTone
  className?: string
}

const toneClasses: Record<StatusTone, string> = {
  rose: "bg-[#c96c83]/12 text-[#b95f76]",
  gold: "bg-[#d4a843]/14 text-[#9a7422]",
  green: "bg-[#5a9e5a]/13 text-[#3f7b3f]",
  gray: "bg-[#8a8d93]/14 text-[#5f6268]",
  red: "bg-[#d4754a]/13 text-[#b45d39]",
  dark: "bg-[#101217] text-white",
}

const statusToneMap: Record<string, StatusTone> = {
  active: "green",
  approved: "green",
  assigned: "green",
  booked: "green",
  completed: "green",
  confirmed: "rose",
  delivered: "green",
  default: "rose",
  failed: "red",
  inactive: "gray",
  in_progress: "gold",
  no_availability: "red",
  no_coverage: "red",
  no_show: "red",
  missed: "dark",
  paid: "green",
  pending: "gold",
  published: "green",
  reviewed: "green",
  shipped: "green",
  off_shift: "gray",
  on_shift: "green",
  cancelled: "gray",
  draft: "gray",
}

export function getStatusTone(status: string): StatusTone {
  return statusToneMap[status.toLowerCase()] ?? "gray"
}

export function formatStatus(status: string) {
  return status.replaceAll("_", " ")
}

export function StatusBadge({ children, tone = "gray", className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center px-2.5 py-1 text-xs font-bold capitalize leading-none",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function StatusBadgeFor({ status, className }: { status: string; className?: string }) {
  return (
    <StatusBadge className={className} tone={getStatusTone(status)}>
      {formatStatus(status)}
    </StatusBadge>
  )
}
