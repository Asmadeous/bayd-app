import type { StepType } from "@reactour/tour"

export const adminNewsletterSteps: StepType[] = [
  {
    selector: '[data-tour="admin-newsletter-header"]',
    content:
      "Welcome to Newsletter management! This page lists everyone who has signed up to " +
      "receive marketing emails from the public website.",
    position: "bottom",
  },
  {
    selector: '[data-tour="admin-newsletter-metrics"]',
    content:
      "The Total Subscribers card gives you a running count of everyone currently on the " +
      "newsletter list.",
    position: "bottom",
  },
  {
    selector: '[data-tour="admin-newsletter-table"]',
    content:
      "Each row shows a subscriber's email, whether they've confirmed their subscription " +
      "(double opt-in), and the date they signed up. Use 'Remove' to unsubscribe someone " +
      "manually — for example, after a complaint or a bounce.",
    position: "top",
  },
]
