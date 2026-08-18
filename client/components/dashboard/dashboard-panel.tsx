import type { ElementType, HTMLAttributes, ReactNode } from "react"

import { cn } from "@/lib/utils"

type DashboardPanelProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode
  as?: ElementType
  className?: string
  tone?: "surface" | "warm" | "dark"
  padding?: "none" | "sm" | "md" | "lg"
}

const toneClasses = {
  surface: "border-black/10 bg-white text-[#101217] shadow-sm shadow-black/[0.03]",
  warm: "border-black/10 bg-[#fbfaf7] text-[#101217] shadow-sm shadow-black/[0.03]",
  dark: "border-white/10 bg-[#17110d] text-white shadow-xl shadow-black/10",
}

const paddingClasses = {
  none: "",
  sm: "p-4",
  md: "p-5 sm:p-6",
  lg: "p-6 sm:p-8",
}

export function DashboardPanel({
  children,
  as,
  className,
  tone = "surface",
  padding = "md",
  ...rest
}: DashboardPanelProps) {
  const Component = as ?? "section"

  return (
    <Component className={cn("border", toneClasses[tone], paddingClasses[padding], className)} {...rest}>
      {children}
    </Component>
  )
}
