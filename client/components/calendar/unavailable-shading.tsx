// Greys out the parts of a day column outside the tech's bookable windows.
// Sits under the slot buttons' hover and never catches clicks. `hourPx` is the
// height of one hour in the grid it sits in.
export function UnavailableShading({
  windows,
  startHour,
  endHour,
  hourPx,
}: {
  windows: { start: string; end: string }[]
  startHour: number
  endHour: number
  hourPx: number
}) {
  const gridStart = startHour * 60
  const gridEnd = endHour * 60
  const open = windows
    .map((w) => [Math.max(gridStart, toMinutes(w.start)), Math.min(gridEnd, toMinutes(w.end))] as const)
    .filter(([a, b]) => b > a)
    .sort((a, b) => a[0] - b[0])
  const closed: [number, number][] = []
  let cursor = gridStart
  for (const [a, b] of open) {
    if (a > cursor) closed.push([cursor, a])
    cursor = Math.max(cursor, b)
  }
  if (cursor < gridEnd) closed.push([cursor, gridEnd])

  return (
    <>
      {closed.map(([a, b]) => (
        <div
          key={a}
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bg-[repeating-linear-gradient(135deg,rgba(16,18,23,0.035),rgba(16,18,23,0.035)_6px,transparent_6px,transparent_12px)]"
          style={{ top: (a - gridStart) * (hourPx / 60), height: (b - a) * (hourPx / 60) }}
        />
      ))}
    </>
  )
}

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number)
  return h * 60 + m
}
