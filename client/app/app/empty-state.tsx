import Link from "next/link"
import type { LucideIcon } from "lucide-react"

import { cardClass, displayClass, mutedClass } from "./app-theme"

// Empty list screens say what goes here and offer the next step, instead of a
// bare "nothing yet" line.
export function EmptyState({
  icon: Icon,
  title,
  text,
  action,
}: {
  icon: LucideIcon
  title: string
  text: string
  action?: { label: string; href: string }
}) {
  return (
    <div className={`flex flex-col items-center px-6 py-10 text-center ${cardClass}`}>
      <span className="grid size-14 place-items-center rounded-full bg-[#C96C83]/10 text-[#C96C83]">
        <Icon className="size-6" aria-hidden />
      </span>
      <p className={`${displayClass} mt-4 text-lg`}>{title}</p>
      <p className={`mt-1 max-w-[16rem] text-sm text-pretty ${mutedClass}`}>{text}</p>
      {action && (
        <Link
          href={action.href}
          className="mt-5 rounded-full bg-[#C96C83] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#C96C83]/25 transition-transform active:scale-[0.97]"
        >
          {action.label}
        </Link>
      )}
    </div>
  )
}
