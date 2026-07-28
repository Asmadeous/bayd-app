import { cn } from "@/lib/utils"

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  className?: string
  accent?: boolean
}

export function StatCard({ label, value, sub, className, accent }: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-black/8 bg-white px-5 py-4 flex flex-col gap-1",
        accent && "border-[#c96c83]/20",
        className
      )}
    >
      <span className="text-xs font-medium text-[#5f6268] uppercase tracking-wide">{label}</span>
      <span
        className="text-3xl font-bold tracking-tight"
        style={{ color: accent ? "#c96c83" : "#101217" }}
      >
        {value}
      </span>
      {sub && <span className="text-xs text-[#5f6268]">{sub}</span>}
    </div>
  )
}
