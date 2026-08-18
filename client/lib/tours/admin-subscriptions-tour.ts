import type { StepType } from "@reactour/tour"

export const adminSubscriptionsSteps: StepType[] = [
  {
    selector: '[data-tour="admin-subscriptions-header"]',
    content:
      "Welcome to Subscriptions! This page lists every recurring service plan customers " +
      "have set up — repeat bookings that happen automatically on a schedule.",
    position: "bottom",
  },
  {
    selector: '[data-tour="admin-subscriptions-filter"]',
    content:
      "Use these tabs to filter the list by status: 'all', 'active', 'paused', or " +
      "'cancelled' subscriptions.",
    position: "bottom",
  },
  {
    selector: '[data-tour="admin-subscriptions-list"]',
    content:
      "Each card is one customer's subscription, showing the service, customer name, " +
      "billing frequency, and next run date. From here you can:\n\n" +
      "• Change the status using the dropdown (active/paused/cancelled)\n" +
      "• Click 'Cancel' to stop future bookings for that plan\n" +
      "• Edit the frequency (e.g. 'Every 2 weeks') and click 'Save' to update it\n" +
      "• Click the trash icon to permanently delete the subscription record",
    position: "top",
  },
]
