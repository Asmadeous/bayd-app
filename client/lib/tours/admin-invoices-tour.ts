import type { StepType } from "@reactour/tour"

export const adminInvoicesSteps: StepType[] = [
  {
    selector: '[data-tour="admin-invoices-header"]',
    content:
      "Welcome to Invoices! This is the single ledger of every transaction across the " +
      "business — bookings, shop orders, and gift card sales. Click 'Manual invoice' to " +
      "create a one-off invoice for a customer.",
    position: "bottom",
  },
  {
    selector: '[data-tour="admin-invoices-filters"]',
    content:
      "Narrow the invoice list using these filters:\n\n" +
      "• Status — issued, paid, void, or refunded\n" +
      "• Type — booking, order, gift card, or manual\n\n" +
      "Combine both filters to quickly find a specific transaction.",
    position: "bottom",
  },
  {
    selector: '[data-tour="admin-invoices-form"]',
    content:
      "The Manual Invoice form lets you bill a customer directly. Enter their customer " +
      "user ID, a description, subtotal, tax, and total, then click 'Create & email' — the " +
      "invoice is generated and sent to the customer automatically.",
    position: "top",
  },
  {
    selector: '[data-tour="admin-invoices-list"]',
    content:
      "Every invoice is listed here with its number, status badge, source (booking, order, " +
      "or gift card), customer, date, and total. Use the row actions to change the status, " +
      "download the PDF, re-email it to the customer, or delete the invoice.",
    position: "top",
  },
]
