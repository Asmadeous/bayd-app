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
      "• Assigned — Successfully matched and turned into a booking\n" +
      "• Failed — Could not be assigned (e.g. no coverage in that area)\n\n" +
      "The count of visible requests is shown on the right.",
    position: "bottom",
  },
  {
    selector: '[data-tour="booking-requests-list"]',
    content:
      "Each card shows the requested service, current status, request type, the " +
      "customer's name and service area, their preferred date/time, and when the " +
      "request came in. Use this list to spot failed requests that need manual follow-up.",
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
