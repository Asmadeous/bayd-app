import type { StepType } from "@reactour/tour"

export const adminOrdersSteps: StepType[] = [
  {
    selector: '[data-tour="admin-orders-header"]',
    content:
      "Welcome to Orders! This page tracks every shop purchase — product orders placed " +
      "by customers through the online store — from checkout to delivery.",
    position: "bottom",
  },
  {
    selector: '[data-tour="admin-orders-filters"]',
    content:
      "Filter orders by fulfillment status — Pending, Confirmed, Shipped, Delivered, or " +
      "Cancelled. The number of orders currently visible is shown on the right.",
    position: "bottom",
  },
  {
    selector: '[data-tour="admin-orders-list"]',
    content:
      "Each card shows the order number, status, customer name, order date, the items " +
      "purchased, and the total charged. Use the status dropdown on the right of each card " +
      "to move the order forward as it's fulfilled and shipped.",
    position: "top",
  },
]
