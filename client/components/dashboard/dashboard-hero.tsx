import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type DashboardHeroProps = {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
  aside?: ReactNode
  className?: string
}

export function DashboardHero({
  eyebrow,
  title,
  description,
  actions,
  aside,
  className,
}: DashboardHeroProps) {
  return (
    <section
      className={cn(
        "relative isolate overflow-hidden bg-[#17110d] px-5 py-6 text-white shadow-xl shadow-black/10 sm:px-7 lg:px-8",
        "bg-[linear-gradient(120deg,rgba(240,200,211,0.16),transparent_34%),linear-gradient(90deg,#17110d,#101217)]",
        className,
      )}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#f0c8d3]">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mt-3 max-w-4xl font-heading text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/68 sm:text-base">
              {description}
            </p>
          ) : null}
          {actions ? <div className="mt-6 flex flex-wrap gap-2">{actions}</div> : null}
        </div>
        {aside ? <div className="min-w-0 lg:min-w-72">{aside}</div> : null}
      </div>
    </section>
  )
}
