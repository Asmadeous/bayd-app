"use client"

import { displayClass, mutedClass } from "./app-theme"

// A lightweight in-app screen header: an editorial serif title and optional
// subtitle + right-side action. App-native (no website nav), used at the top of
// each tab screen.
export function AppHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
}) {
  return (
    <header className="flex items-end justify-between gap-3 px-5 pb-4 pt-[calc(1.25rem+env(safe-area-inset-top))]">
      <div className="min-w-0">
        <h1 className={`${displayClass} truncate text-[2rem] leading-[1.05] tracking-[-0.01em]`}>
          {title}
        </h1>
        {subtitle && <p className={`mt-1 truncate text-sm ${mutedClass}`}>{subtitle}</p>}
      </div>
      {action}
    </header>
  )
}
