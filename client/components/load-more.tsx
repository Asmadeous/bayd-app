import { BubbleLoader } from "@/components/bubble-loader"
import { cn } from "@/lib/utils"

// "Load more" under a paged list. Hidden once there's nothing left to load.
export function LoadMore({
  hasMore,
  loading,
  onLoad,
  label = "Load more",
  className,
}: {
  hasMore: boolean
  loading: boolean
  onLoad: () => void
  label?: string
  className?: string
}) {
  if (!hasMore) return null
  return loading ? (
    <BubbleLoader className={cn("py-4", className)} />
  ) : (
    <button
      type="button"
      onClick={onLoad}
      className={cn(
        "block w-full rounded-xl bg-[#C96C83]/10 py-3 text-sm font-bold text-[#9E4A60] transition-colors active:bg-[#C96C83]/20",
        className,
      )}
    >
      {label}
    </button>
  )
}
