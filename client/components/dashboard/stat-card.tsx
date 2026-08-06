import { cn } from "@/lib/utils"
import { MetricCard } from "@/components/dashboard/metric-card"

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  className?: string
  accent?: boolean
}

export function StatCard({ label, value, sub, className, accent }: StatCardProps) {
  return (
    <MetricCard
      accent={accent}
      className={cn("min-h-28", className)}
      detail={sub}
      label={label}
      value={value}
    />
  )
}
