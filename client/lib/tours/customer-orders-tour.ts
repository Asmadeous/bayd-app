import type { StepType } from "@reactour/tour"

export const customerOrdersSteps: StepType[] = [
  {
    selector: '[data-tour="customer-orders-header"]',
    content:
      "Welcome to your Orders page! Track every product order you've placed from the " +
      "B.A.Y.D shop, from checkout through delivery.",
    position: "bottom",
  },
  {
    selector: '[data-tour="customer-orders-list"]',
    content:
      "Each order card shows the order number, current status, date placed, the items " +
      "you bought, and the total amount charged.",
    position: "top",
  },
  {
    selector: '[data-tour="customer-orders-pagination"]',
    content:
      "Use these buttons to browse through older orders when you have more than fit on " +
      "one screen.",
    position: "top",
  },
]
