"use client"

import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type SheetProps = {
  children: ReactNode
  onOpenChange?: (open: boolean) => void
  open: boolean
  swipeDirection?: "left" | "right"
}

export function Sheet({ children, onOpenChange, open }: SheetProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <button
        aria-label="Close panel"
        className="absolute inset-0 bg-black/40"
        onClick={() => onOpenChange?.(false)}
        type="button"
      />
      {children}
    </div>
  )
}

export function SheetContent({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <aside
      className={cn(
        "absolute right-0 top-0 flex h-full w-full max-w-md flex-col overflow-y-auto bg-white p-6 shadow-2xl",
        className
      )}
    >
      {children}
    </aside>
  )
}

export function SheetHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <header className={cn("space-y-2 border-b border-black/8 pb-5", className)}>{children}</header>
}

export function SheetTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={className}>{children}</h2>
}

export function SheetDescription({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={className}>{children}</p>
}

export function SheetBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex-1 pt-5", className)}>{children}</div>
}
