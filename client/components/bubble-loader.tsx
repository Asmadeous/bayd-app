import { cn } from "@/lib/utils"

const DELAYS = ["[animation-delay:0ms]", "[animation-delay:160ms]", "[animation-delay:320ms]"]

const TONES = {
  light: "bg-white",
  brand: "bg-[#C96C83]",
  ink: "bg-[#14100F]",
} as const

// Three soft bubbles that swell and rise in turn. The app's loading indicator,
// also played on the launch splash.
export function BubbleLoader({
  tone = "brand",
  label,
  className,
}: {
  tone?: keyof typeof TONES
  label?: string
  className?: string
}) {
  return (
    <div role="status" aria-live="polite" className={cn("flex flex-col items-center gap-3", className)}>
      <span className="flex h-5 items-end gap-2" aria-hidden>
        {DELAYS.map((delay) => (
          <span
            key={delay}
            className={cn(
              "size-2.5 rounded-full shadow-[inset_0_-2px_3px_rgba(0,0,0,0.12),inset_0_2px_2px_rgba(255,255,255,0.55)] animate-bubble motion-reduce:animate-none",
              TONES[tone],
              delay,
            )}
          />
        ))}
      </span>
      {label ? (
        <span className={cn("text-sm font-semibold", tone === "light" ? "text-white/75" : "text-[#14100F]/55")}>{label}</span>
      ) : (
        <span className="sr-only">Loading</span>
      )}
    </div>
  )
}
