"use client"

import { useAuthStore } from "@/lib/stores/auth-store"

interface DashboardHeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export function DashboardHeader({ title, subtitle, actions }: DashboardHeaderProps) {
  const { user } = useAuthStore()
  const greeting = user?.first_name ? `Hi, ${user.first_name}` : "Hi there"

  return (
    <div className="relative isolate overflow-hidden border border-black/10 bg-white/70 bg-[linear-gradient(135deg,rgba(240,200,211,0.22),transparent_38%)] px-5 py-5 shadow-sm shadow-black/[0.03] sm:px-6 lg:px-7">
      <div className="pointer-events-none absolute bottom-0 left-0 -z-10 h-px w-full bg-gradient-to-r from-transparent via-[#c96c83]/25 to-transparent" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#a36f4d]">
          {greeting}
          </p>
          <h1 className="mt-2 font-heading text-3xl font-extrabold leading-tight text-[#101217] sm:text-4xl">
            {title}
          </h1>
          {subtitle && <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5f6268]">{subtitle}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2 sm:pt-1">{actions}</div>}
      </div>
    </div>
  )
}
