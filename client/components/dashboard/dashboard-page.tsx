import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type DashboardPageProps = {
  children: ReactNode
  className?: string
  maxWidth?: "default" | "narrow" | "wide"
}

const maxWidthClasses = {
  default: "max-w-[1320px]",
  narrow: "max-w-4xl",
  wide: "max-w-[1540px]",
}

export function DashboardPage({
  children,
  className,
  maxWidth = "default",
}: DashboardPageProps) {
  return (
    <div className={cn("mx-auto w-full space-y-6", maxWidthClasses[maxWidth], className)}>
      {children}
    </div>
  )
}
