import { cn } from "@/lib/utils"

const PERIODS = [
  { label: "Morning", from: 0, to: 12 * 60 },
  { label: "Afternoon", from: 12 * 60, to: 17 * 60 },
  { label: "Evening", from: 17 * 60, to: 24 * 60 },
]

// Open times split into Morning / Afternoon / Evening like Square's picker. Times
// are the backend's 24h "HH:MM" in the company zone.
export function TimeGroups({
  times,
  selected,
  onPick,
}: {
  times: string[]
  selected: string
  onPick: (time: string) => void
}) {
  return (
    <div className="space-y-4">
      {PERIODS.map((period) => {
        const list = times.filter((t) => {
          const minutes = toMinutes(t)
          return minutes >= period.from && minutes < period.to
        })
        return (
          <div key={period.label}>
            <p className="mb-2 text-sm font-bold text-[#101217]">{period.label}</p>
            {list.length === 0 ? (
              <p className="text-sm font-medium text-[#8a8d93]">No availability</p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {list.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => onPick(t)}
                    aria-pressed={t === selected}
                    className={cn(
                      "h-11 rounded-xl text-sm font-bold transition-colors",
                      t === selected ? "bg-[#101217] text-white" : "bg-black/[0.05] text-[#101217] hover:bg-black/10",
                    )}
                  >
                    {formatTime(t)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function toMinutes(t: string) {
  const [h, m] = t.split(":").map(Number)
  return h * 60 + m
}

export function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return t
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`
}
