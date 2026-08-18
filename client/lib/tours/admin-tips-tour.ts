import type { StepType } from "@reactour/tour"

export const adminTipsSteps: StepType[] = [
  {
    selector: '[data-tour="admin-tips-header"]',
    content:
      "Welcome to Tips Owed! This page tracks card tips that customers left for " +
      "technicians during checkout, which the business collected on their behalf and " +
      "still needs to pay out.",
    position: "bottom",
  },
  {
    selector: '[data-tour="admin-tips-list"]',
    content:
      "Each row shows a technician and the total amount of tips currently owed to them. " +
      "Once you've paid a technician their tips in person or by transfer, click 'Mark " +
      "paid out' to clear the balance and reset it to zero.",
    position: "top",
  },
]
