import type { Booking } from "@/lib/hooks/use-bookings"

// A multi-service visit is several bookings (one per service, each with its own
// tech). Lists show it once, on its first service, with every line inside.

export interface VisitLineView {
  bookingId: number
  serviceId: number
  serviceName: string
  startsAt: string
  endsAt: string
  status: Booking["status"]
  total: number
  tech: { id: number | null; userId: number | null; name: string | null; photoUrl: string | null }
}

export function isVisit(b: Booking) {
  return (b.visit_lines?.length ?? 0) > 0
}

// Every service of the booking's visit in time order (just itself when it's a
// standalone booking). Cancelled lines drop out unless the whole visit is.
export function visitLines(b: Booking): VisitLineView[] {
  const all: VisitLineView[] = [
    {
      bookingId: b.id,
      serviceId: b.service?.id,
      serviceName: b.service?.name ?? "Service",
      startsAt: b.starts_at,
      endsAt: b.ends_at,
      status: b.status,
      total: Number(b.total) || 0,
      tech: {
        id: b.employee_profile?.id ?? null,
        userId: b.employee_profile?.user_id ?? null,
        name: b.employee_profile?.name ?? null,
        photoUrl: b.employee_profile?.photo_url ?? null,
      },
    },
    ...(b.visit_lines ?? []).map((l) => ({
      bookingId: l.id,
      serviceId: l.service_id,
      serviceName: l.service_name ?? "Service",
      startsAt: l.starts_at,
      endsAt: l.ends_at,
      status: l.status,
      total: Number(l.total) || 0,
      tech: { id: l.employee.id, userId: l.employee.user_id, name: l.employee.name, photoUrl: l.employee.photo_url },
    })),
  ].sort((x, y) => new Date(x.startsAt).getTime() - new Date(y.startsAt).getTime())
  const live = all.filter((l) => l.status !== "cancelled")
  return live.length ? live : all
}

export function visitTitle(b: Booking) {
  return visitLines(b).map((l) => l.serviceName).join(" + ")
}

// "Claire and Rim" - everyone coming, once each.
export function visitTechNames(b: Booking) {
  const names = Array.from(new Set(visitLines(b).map((l) => l.tech.name).filter((n): n is string => !!n)))
  if (names.length <= 1) return names[0] ?? ""
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`
}

export function visitTechs(b: Booking) {
  const seen = new Map<number | string, VisitLineView["tech"]>()
  for (const l of visitLines(b)) seen.set(l.tech.id ?? l.tech.name ?? l.bookingId, l.tech)
  return Array.from(seen.values())
}

export function visitTotal(b: Booking) {
  return visitLines(b).reduce((sum, l) => sum + l.total, 0)
}

export function visitStart(b: Booking) {
  return visitLines(b)[0]?.startsAt ?? b.starts_at
}

export function visitEnd(b: Booking) {
  const lines = visitLines(b)
  return lines[lines.length - 1]?.endsAt ?? b.ends_at
}

// One entry per visit, in the list's order: the visit is represented by its
// earliest live service (standalone bookings pass through unchanged).
export function collapseVisits(bookings: Booking[]) {
  const lead = new Map<number, number>()
  for (const b of bookings) {
    if (b.visit_id == null) continue
    const first = visitLines(b)[0]?.bookingId
    if (first != null) lead.set(b.visit_id, first)
  }
  const seen = new Set<number>()
  const out: Booking[] = []
  for (const b of bookings) {
    if (b.visit_id == null) {
      out.push(b)
      continue
    }
    if (seen.has(b.visit_id)) continue
    const leadId = lead.get(b.visit_id)
    const rep = bookings.find((x) => x.id === leadId) ?? b
    seen.add(b.visit_id)
    out.push(rep)
  }
  return out
}
