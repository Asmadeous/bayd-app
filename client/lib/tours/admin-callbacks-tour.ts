import type { StepType } from "@reactour/tour"

export const adminCallbacksSteps: StepType[] = [
  {
    selector: '[data-tour="callbacks-header"]',
    content:
      "Welcome to Callbacks! This queue holds customers who are outside our dispatch " +
      "coverage area — they need a manual follow-up call instead of an automatic booking.",
    position: "bottom",
  },
  {
    selector: '[data-tour="callbacks-list"]',
    content:
      "Each card shows the customer's name, postal code, phone number, and the service " +
      "they were interested in, along with when the request came in.\n\n" +
      "Use the status dropdown to mark progress — New, Contacted, Booked, or Declined — " +
      "and click 'Call' to dial the customer directly from your device.",
    position: "top",
  },
]
