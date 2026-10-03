"use client"

import { useState } from "react"
import { Plus, Trash2 } from "lucide-react"

import { useToast } from "@/components/bayd-toast-provider"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  useAddDateOverride,
  useDateOverrides,
  useDeleteDateOverride,
  useDeleteWeeklyHours,
  useSaveWeeklyHours,
  useToggleDispatch,
  useWeeklyHours,
  wallClock,
  type WeeklyHours,
} from "@/lib/hooks/use-staff-availability"
import { bookingZoneLabel } from "@/lib/booking-time"

// Monday first, the way the team plans a week. day_of_week is 0 = Sunday.
const DAYS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 0, label: "Sunday" },
]

const inputClass = "h-8 border border-black/15 bg-white px-2 text-sm focus:border-[#c96c83] focus:outline-none"

function apiError(e: unknown) {
  const data = (e as { response?: { data?: { error?: string; errors?: string[] } } })?.response?.data
  return data?.error ?? data?.errors?.join(", ") ?? "Please try again."
}

// A technician's bookable hours: the weekly template customers book against,
// plus date overrides (a day off, or extra hours on a date). Dispatch only
// auto-assigns a tech inside these hours, and only while auto-assign is on.
export function StaffHoursSheet({
  employeeId,
  name,
  dispatchable,
  open,
  onOpenChange,
}: {
  employeeId: number
  name: string
  dispatchable: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} swipeDirection="right">
      <SheetContent>
        <SheetHeader>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a36f4d]">Hours</p>
          <SheetTitle className="text-xl font-extrabold leading-tight text-[#101217]">{name || "Staff member"}</SheetTitle>
          <SheetDescription className="text-sm leading-6 text-[#5f6268]">
            Customers can only book this technician inside these hours ({bookingZoneLabel()} time).
          </SheetDescription>
        </SheetHeader>
        {open ? (
          <SheetBody className="space-y-6">
            <DispatchToggle employeeId={employeeId} dispatchable={dispatchable} />
            <WeeklySchedule employeeId={employeeId} />
            <TimeOff employeeId={employeeId} />
          </SheetBody>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

function DispatchToggle({ employeeId, dispatchable }: { employeeId: number; dispatchable: boolean }) {
  const { toast } = useToast()
  const toggle = useToggleDispatch(employeeId)
  const [on, setOn] = useState(dispatchable)

  function flip() {
    toggle.mutate(undefined, {
      onSuccess: (data) => {
        setOn(data.dispatchable)
        toast({ title: data.dispatchable ? "Auto-assign resumed" : "Auto-assign paused", variant: "success" })
      },
      onError: (e) => toast({ title: "Couldn't update auto-assign", description: apiError(e), variant: "error" }),
    })
  }

  return (
    <div className="flex items-center justify-between gap-3 border border-black/8 bg-[#fbfaf7] px-4 py-3">
      <div>
        <p className="text-sm font-bold text-[#101217]">Auto-assign {on ? "on" : "paused"}</p>
        <p className="text-xs text-[#5f6268]">
          {on
            ? "New bookings can be matched to this technician."
            : "New bookings won't be matched to this technician. Existing bookings stay."}
        </p>
      </div>
      <Button size="xs" variant="outline" disabled={toggle.isPending} onClick={flip}>
        {on ? "Pause" : "Resume"}
      </Button>
    </div>
  )
}

function WeeklySchedule({ employeeId }: { employeeId: number }) {
  const { data: hours = [], isLoading } = useWeeklyHours(employeeId)

  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#a36f4d]">Weekly hours</p>
      {isLoading ? (
        <p className="text-sm text-[#5f6268]">Loading hours...</p>
      ) : (
        <div className="divide-y divide-black/8 border border-black/8 bg-white">
          {DAYS.map((day) => (
            <DayRow
              key={day.value}
              employeeId={employeeId}
              day={day}
              windows={hours.filter((h) => h.day_of_week === day.value)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function DayRow({
  employeeId,
  day,
  windows,
}: {
  employeeId: number
  day: { value: number; label: string }
  windows: WeeklyHours[]
}) {
  const [adding, setAdding] = useState(false)

  return (
    <div className="px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-[#101217]">{day.label}</p>
        {windows.length === 0 && !adding ? <span className="text-xs text-[#8a8d93]">Not working</span> : null}
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-[#c96c83] hover:underline"
        >
          <Plus className="size-3.5" /> Add hours
        </button>
      </div>
      <div className="mt-1 space-y-1.5">
        {windows.map((w) => (
          <HoursEditor key={w.id} employeeId={employeeId} dayOfWeek={day.value} window={w} />
        ))}
        {adding ? (
          <HoursEditor employeeId={employeeId} dayOfWeek={day.value} onDone={() => setAdding(false)} />
        ) : null}
      </div>
    </div>
  )
}

function HoursEditor({
  employeeId,
  dayOfWeek,
  window,
  onDone,
}: {
  employeeId: number
  dayOfWeek: number
  window?: WeeklyHours
  onDone?: () => void
}) {
  const { toast } = useToast()
  const save = useSaveWeeklyHours(employeeId)
  const remove = useDeleteWeeklyHours(employeeId)
  const [start, setStart] = useState(window ? wallClock(window.start_time) : "09:00")
  const [end, setEnd] = useState(window ? wallClock(window.end_time) : "17:00")
  const dirty = !window || start !== wallClock(window.start_time) || end !== wallClock(window.end_time)

  function submit() {
    save.mutate(
      { id: window?.id, day_of_week: dayOfWeek, start_time: start, end_time: end },
      {
        onSuccess: () => {
          toast({ title: "Hours saved", variant: "success" })
          onDone?.()
        },
        onError: (e) => toast({ title: "Hours not saved", description: apiError(e), variant: "error" }),
      },
    )
  }

  function drop() {
    if (!window) return onDone?.()
    remove.mutate(window.id, {
      onSuccess: () => toast({ title: "Hours removed", variant: "success" }),
      onError: (e) => toast({ title: "Hours not removed", description: apiError(e), variant: "error" }),
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input aria-label="Start" type="time" step={900} value={start} onChange={(e) => setStart(e.target.value)} className={inputClass} />
      <span className="text-xs text-[#5f6268]">to</span>
      <input aria-label="End" type="time" step={900} value={end} onChange={(e) => setEnd(e.target.value)} className={inputClass} />
      {dirty ? (
        <Button size="xs" disabled={save.isPending || !start || !end} onClick={submit}>
          Save
        </Button>
      ) : null}
      <button type="button" onClick={drop} disabled={remove.isPending} aria-label="Remove these hours" className="p-1 text-[#d4754a]">
        <Trash2 className="size-3.5" />
      </button>
    </div>
  )
}

function TimeOff({ employeeId }: { employeeId: number }) {
  const { toast } = useToast()
  const { data: overrides = [], isLoading } = useDateOverrides(employeeId)
  const add = useAddDateOverride(employeeId)
  const remove = useDeleteDateOverride(employeeId)
  const today = new Date().toLocaleDateString("en-CA")
  const [date, setDate] = useState("")
  const [kind, setKind] = useState<"off" | "extra">("off")
  const [start, setStart] = useState("09:00")
  const [end, setEnd] = useState("17:00")
  const upcoming = overrides.filter((o) => o.date >= today)

  function submit() {
    add.mutate(
      kind === "extra" ? { date, available: true, start_time: start, end_time: end } : { date, available: false },
      {
        onSuccess: () => {
          setDate("")
          toast({ title: kind === "off" ? "Time off added" : "Extra hours added", variant: "success" })
        },
        onError: (e) => toast({ title: "Not saved", description: apiError(e), variant: "error" }),
      },
    )
  }

  function describe(o: { available: boolean; start_time: string | null; end_time: string | null }) {
    const hours = o.start_time && o.end_time ? `${wallClock(o.start_time)}-${wallClock(o.end_time)}` : null
    return o.available ? `Working ${hours ?? ""}`.trim() : "Day off"
  }

  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#a36f4d]">Time off and extra days</p>
      <p className="mb-3 text-xs text-[#5f6268]">A date here replaces that day&apos;s weekly hours.</p>

      <div className="space-y-2 border border-black/8 bg-[#fbfaf7] p-3">
        <div className="flex flex-wrap items-center gap-2">
          <input aria-label="Date" type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
          <select aria-label="Type" value={kind} onChange={(e) => setKind(e.target.value as "off" | "extra")} className={inputClass}>
            <option value="off">Day off</option>
            <option value="extra">Working hours on this date</option>
          </select>
        </div>
        {kind === "extra" ? (
          <div className="flex items-center gap-2">
            <input aria-label="From" type="time" step={900} value={start} onChange={(e) => setStart(e.target.value)} className={inputClass} />
            <span className="text-xs text-[#5f6268]">to</span>
            <input aria-label="Until" type="time" step={900} value={end} onChange={(e) => setEnd(e.target.value)} className={inputClass} />
          </div>
        ) : null}
        <Button size="xs" disabled={!date || add.isPending} onClick={submit}>
          Add
        </Button>
      </div>

      {isLoading ? null : upcoming.length === 0 ? (
        <p className="mt-3 text-xs text-[#8a8d93]">No upcoming time off or extra days.</p>
      ) : (
        <ul className="mt-3 divide-y divide-black/8 border border-black/8 bg-white">
          {upcoming.map((o) => (
            <li key={o.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <span className="font-bold text-[#101217]">
                {new Date(`${o.date}T12:00:00`).toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" })}
              </span>
              <span className={o.available ? "text-[#3f7b3f]" : "text-[#b45d39]"}>{describe(o)}</span>
              <button
                type="button"
                aria-label="Remove"
                disabled={remove.isPending}
                onClick={() =>
                  remove.mutate(o.id, {
                    onError: (e) => toast({ title: "Not removed", description: apiError(e), variant: "error" }),
                  })
                }
                className="ml-auto p-1 text-[#d4754a]"
              >
                <Trash2 className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
