import { bookingLocalMinutes } from "@/lib/booking-time"
import type { Booking } from "@/lib/hooks/use-bookings"

export interface PlacedBooking {
  booking: Booking
  startMin: number
  endMin: number
  column: number
  columns: number
}

const DAY_END = 24 * 60

// Place one day's bookings on an hour grid. Bookings that overlap share the
// width: each cluster of transitively overlapping bookings is split into as many
// columns as it needs, and every booking in it takes one column.
export function layoutDay(bookings: Booking[]): PlacedBooking[] {
  const items = bookings
    .map((booking) => {
      const startMin = bookingLocalMinutes(booking.starts_at)
      const rawEnd = bookingLocalMinutes(booking.ends_at)
      // An end at or before the start ran past local midnight: clip to the day.
      const endMin = rawEnd > startMin ? rawEnd : DAY_END
      return { booking, startMin, endMin: Math.max(endMin, startMin + 15), column: 0, columns: 1 }
    })
    .sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin)

  let cluster: PlacedBooking[] = []
  let clusterEnd = -1
  const columnEnds: number[] = []

  const closeCluster = () => {
    const width = Math.max(1, ...cluster.map((p) => p.column + 1))
    for (const p of cluster) p.columns = width
    cluster = []
    columnEnds.length = 0
  }

  for (const item of items) {
    if (item.startMin >= clusterEnd && cluster.length) closeCluster()
    let column = columnEnds.findIndex((end) => end <= item.startMin)
    if (column === -1) column = columnEnds.length
    columnEnds[column] = item.endMin
    item.column = column
    cluster.push(item)
    clusterEnd = Math.max(clusterEnd, item.endMin)
  }
  if (cluster.length) closeCluster()

  return items
}

// Hour span for the grid: business-ish hours by default, widened to fit any
// booking outside them.
export function gridHours(placed: PlacedBooking[], defaultStart = 7, defaultEnd = 22) {
  const start = Math.min(defaultStart, ...placed.map((p) => Math.floor(p.startMin / 60)))
  const end = Math.max(defaultEnd, ...placed.map((p) => Math.ceil(p.endMin / 60)))
  return { startHour: start, endHour: Math.min(24, end) }
}
