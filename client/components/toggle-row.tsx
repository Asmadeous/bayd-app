import type { LucideIcon } from "lucide-react"

// A settings row with an on/off switch (both apps' Profile screens).
export function ToggleRow({
  icon: Icon,
  label,
  checked,
  disabled,
  onToggle,
  last,
}: {
  icon: LucideIcon
  label: string
  checked: boolean
  disabled?: boolean
  onToggle: () => void
  last?: boolean
}) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3.5 ${last ? "" : "border-b border-black/5"}`}>
      <Icon className="size-5 text-[#c96c83]" aria-hidden />
      <span className="min-w-0 flex-1 text-sm font-semibold text-[#101217]">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={onToggle}
        disabled={disabled}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-40 ${
          checked ? "bg-[#c96c83]" : "bg-black/15"
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 size-6 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : ""
          }`}
        />
      </button>
    </div>
  )
}
