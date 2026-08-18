import type { StepType } from "@reactour/tour"

export const adminBookingsSteps: StepType[] = [
  {
    selector: '[data-tour="bookings-header"]',
    content:
      "Welcome to Bookings! This is the full list of every appointment across the " +
      "business — confirmed, in progress, completed, or cancelled.",
    position: "bottom",
  },
  {
    selector: '[data-tour="bookings-view-toggle"]',
    content:
      "Switch between List view (bookings as cards sorted by date) and Calendar view " +
      "(a month grid you can click through). The total booking count is shown on the right.",
    position: "bottom",
  },
  {
    selector: '[data-tour="bookings-status-filter"]',
    content:
      "In List view, filter bookings by status — All, Pending, Confirmed, In Progress, " +
      "Completed, Cancelled, or No Show — to quickly find the appointments you need.",
    position: "bottom",
  },
  {
    selector: '[data-tour="bookings-content"]',
    content:
      "This is the main Bookings area. Each card shows the service, client, technician, " +
      "date/time, and price. Use the action buttons on a card to reassign the technician, " +
      "move it to In Progress or Completed, or cancel it. In Calendar view, click any day " +
      "to filter the side panel to that date.",
    position: "top",
  },
  {
    selector: '[data-tour="bookings-pagination"]',
    content:
      "Use Prev/Next to page through the full booking list when there are more results " +
      "than fit on one screen.",
    position: "top",
  },
]
