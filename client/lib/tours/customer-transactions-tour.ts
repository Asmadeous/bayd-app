import type { StepType } from "@reactour/tour"

export const customerTransactionsSteps: StepType[] = [
  {
    selector: '[data-tour="customer-transactions-header"]',
    content:
      "Welcome to your Transactions page! Review every receipt, invoice, and payment " +
      "you've made with B.A.Y.D — bookings, product orders, and gift cards, all in one place.",
    position: "bottom",
  },
  {
    selector: '[data-tour="customer-transactions-filters"]',
    content:
      "Filter your transactions by type — Bookings, Products, or Gift Cards — to quickly " +
      "find the receipt you're looking for.",
    position: "bottom",
  },
  {
    selector: '[data-tour="customer-transactions-list"]',
    content:
      "Each row shows the invoice number, status, and total. Tap 'View receipt' to see " +
      "the full breakdown, or 'PDF' to download a copy for your records.",
    position: "top",
  },
]
