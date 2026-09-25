import type { StepType } from "@reactour/tour"

export const adminCalendarSteps: StepType[] = [
  {
    selector: '[data-tour="calendar-header"]',
    content:
      "Welcome to the Company Calendar! This gives you a bird's-eye view of every " +
      "booking across the entire business, laid out by date.",
    position: "bottom",
  },
  {
    selector: '[data-tour="calendar-grid"]',
    content:
      "Switch between Month, Week, and Day. Click an appointment to reschedule, " +
      "reassign, start, complete, or cancel it. Click an empty future time (or the + " +
      "on a day) to book a client for a technician. Filter by technician, and tick " +
      "Show cancelled to see cancelled bookings.",
    position: "bottom",
  },
]
