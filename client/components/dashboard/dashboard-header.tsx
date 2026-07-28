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
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "#a36f4d" }}>
          {greeting}
        </p>
        <h1 className="text-2xl font-bold text-[#101217] mt-0.5">{title}</h1>
        {subtitle && <p className="text-sm text-[#5f6268] mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
    </div>
  )
}
