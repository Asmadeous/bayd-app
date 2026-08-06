import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

type MetricCardProps = {
  label: string
  value: ReactNode
  detail?: ReactNode
  icon?: LucideIcon
  trend?: ReactNode
  accent?: boolean
  className?: string
}

export function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  trend,
  accent,
  className,
}: MetricCardProps) {
  return (
    <article
      className={cn(
        "relative overflow-hidden border border-black/10 bg-white px-5 py-4 shadow-sm shadow-black/[0.03]",
        accent && "border-[#c96c83]/30 bg-[#fffafb]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#6b6f76]">{label}</p>
          <div
            className={cn(
              "mt-3 font-heading text-4xl font-extrabold leading-none tracking-tight text-[#101217]",
              accent && "text-[#c96c83]",
            )}
          >
            {value}
          </div>
        </div>
        {Icon ? (
          <span
            className={cn(
              "grid size-10 shrink-0 place-items-center bg-[#101217] text-white",
              accent && "bg-[#c96c83]",
            )}
          >
            <Icon aria-hidden="true" className="size-4" />
          </span>
        ) : null}
      </div>
      {(detail || trend) && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs leading-5 text-[#5f6268]">
          {detail ? <span>{detail}</span> : <span />}
          {trend ? <span className="font-semibold text-[#101217]">{trend}</span> : null}
        </div>
      )}
    </article>
  )
}
