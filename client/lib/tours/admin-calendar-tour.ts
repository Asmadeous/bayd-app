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
      "This month grid shows every day with scheduled appointments. Click any day to " +
      "filter the panel on the right down to just that date's bookings.",
    position: "right",
  },
  {
    selector: '[data-tour="calendar-day-panel"]',
    content:
      "The Day Panel lists bookings for whichever date you've selected on the calendar. " +
      "If no day is selected, it shows a preview of all upcoming bookings. Each entry " +
      "shows the service, client, technician, and time.",
    position: "left",
  },
]
