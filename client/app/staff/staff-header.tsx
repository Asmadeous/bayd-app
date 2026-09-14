"use client"

import { displayClass, mutedClass } from "./staff-theme"

// Lightweight staff screen header: heavy title + optional subtitle and a
// right-side action. App-native, used at the top of each staff tab.
export function StaffHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
}) {
  return (
    <header className="flex items-end justify-between gap-3 px-5 pb-3 pt-[calc(1.25rem+env(safe-area-inset-top))]">
      <div className="min-w-0">
        <h1 className={`${displayClass} truncate text-[1.9rem] leading-[1.05]`}>{title}</h1>
        {subtitle && <p className={`mt-1 truncate text-sm ${mutedClass}`}>{subtitle}</p>}
      </div>
      {action}
    </header>
  )
}
