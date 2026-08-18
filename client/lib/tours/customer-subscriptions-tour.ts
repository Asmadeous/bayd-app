import type { StepType } from "@reactour/tour"

export const customerSubscriptionsSteps: StepType[] = [
  {
    selector: '[data-tour="customer-subscriptions-header"]',
    content:
      "Welcome to your Subscriptions page! This is where you manage recurring beauty " +
      "services — appointments that repeat automatically on a schedule you choose.",
    position: "bottom",
  },
  {
    selector: '[data-tour="customer-subscriptions-list"]',
    content:
      "Each card shows a recurring service, its frequency, and your next visit or charge. " +
      "You can 'Skip next' if you need a break, 'Pause' or 'Resume' the whole plan, " +
      "change how often it repeats, or 'Cancel' if you're done. " +
      "Tap 'Billing history' to see past charges for that subscription.",
    position: "top",
  },
]
