import type { StepType } from "@reactour/tour"

export const customerBookingsSteps: StepType[] = [
  {
    selector: '[data-tour="customer-bookings-header"]',
    content:
      "Welcome to your Bookings page! Review every mobile beauty appointment you've made, " +
      "past and upcoming, as a list or on a calendar.",
    position: "bottom",
  },
  {
    selector: '[data-tour="customer-bookings-view-toggle"]',
    content:
      "Switch between List view and Calendar view. List view shows your appointments as " +
      "cards sorted by date. Calendar view shows a month grid so you can see your " +
      "bookings laid out visually.",
    position: "bottom",
  },
  {
    selector: '[data-tour="customer-bookings-filters"]',
    content:
      "Filter your bookings by status — like pending, confirmed, in progress, completed, " +
      "or cancelled — to quickly find the appointment you're looking for.",
    position: "bottom",
  },
  {
    selector: '[data-tour="customer-bookings-content"]',
    content:
      "Your appointments appear here. Each card shows the service, date/time, price, and " +
      "status. You can cancel an upcoming appointment, or leave a review once a service " +
      "is completed. In Calendar view, click any day to see that date's appointments.",
    position: "top",
  },
]
