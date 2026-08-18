import type { StepType } from "@reactour/tour"

export const customerNotificationsSteps: StepType[] = [
  {
    selector: '[data-tour="customer-notifications-header"]',
    content:
      "Welcome to your Notifications page! This is where you'll find booking updates, " +
      "receipts, and account notices sent to you. Use 'Mark all read' to clear your " +
      "unread count in one tap.",
    position: "bottom",
  },
  {
    selector: '[data-tour="customer-notifications-list"]',
    content:
      "Each notification shows a short preview. Tap 'View details' to open the full " +
      "message in a side panel, or tap 'Mark read' to dismiss the 'New' badge without " +
      "opening it.",
    position: "top",
  },
  {
    selector: '[data-tour="customer-notifications-pagination"]',
    content:
      "Use these buttons to page through your older notifications when you have more " +
      "than fit on one screen.",
    position: "top",
  },
]
