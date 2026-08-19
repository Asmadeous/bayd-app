import type { StepType } from "@reactour/tour"

export const adminBookingRequestsSteps: StepType[] = [
  {
    selector: '[data-tour="booking-requests-header"]',
    content:
      "Welcome to Booking Requests! This is the raw intake queue — every service request " +
      "submitted by a customer before it's turned into a confirmed booking and assigned " +
      "to a technician.",
    position: "bottom",
  },
  {
    selector: '[data-tour="booking-requests-filters"]',
    content:
      "Filter requests by status:\n\n" +
      "• Pending — Waiting to be matched with a technician\n" +
      "• Assigned/Booked — Successfully matched or turned into a booking\n" +
      "• No coverage/availability or Failed — Needs manual follow-up\n\n" +
      "The count of visible requests is shown on the right.",
    position: "bottom",
  },
  {
    selector: '[data-tour="booking-requests-list"]',
    content:
      "Each card shows the requested service, current status, request type, the " +
      "customer, address, requested time, and when the request came in. Open Details " +
      "to review assignment attempts for requests that need manual follow-up.",
    position: "top",
  },
  {
    selector: '[data-tour="booking-requests-pagination"]',
    content:
      "Use Prev/Next to page through older booking requests when the queue grows " +
      "beyond a single page.",
    position: "top",
  },
]
