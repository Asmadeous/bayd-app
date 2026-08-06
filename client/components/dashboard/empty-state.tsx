import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

type EmptyStateProps = {
  title: string
  description?: string
  icon?: LucideIcon
  action?: ReactNode
  className?: string
}

export function EmptyState({ title, description, icon: Icon, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "grid place-items-center border border-black/10 bg-white px-5 py-12 text-center shadow-sm shadow-black/[0.03]",
        className,
      )}
    >
      <div className="max-w-md">
        {Icon ? (
          <span className="mx-auto grid size-12 place-items-center bg-[#101217] text-white">
            <Icon aria-hidden="true" className="size-5" />
          </span>
        ) : null}
        <h2 className="mt-4 text-base font-extrabold text-[#101217]">{title}</h2>
        {description ? <p className="mt-2 text-sm leading-6 text-[#5f6268]">{description}</p> : null}
        {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
      </div>
    </div>
  )
}
