import type { StepType } from "@reactour/tour"

export const adminAnalyticsSteps: StepType[] = [
  {
    selector: '[data-tour="analytics-header"]',
    content:
      "Welcome to Analytics! This is where you track the business's sales performance " +
      "and see how each worker is doing, over whatever time period you choose.",
    position: "bottom",
  },
  {
    selector: '[data-tour="analytics-period"]',
    content:
      "Use this Period Selector to change the reporting window — 7 days, 30 days, " +
      "90 days, year to date, or all time. Every number on this page updates to match " +
      "the period you pick.",
    position: "bottom",
  },
  {
    selector: '[data-tour="analytics-summary"]',
    content:
      "These summary cards give you the headline numbers for the selected period:\n\n" +
      "• Total Revenue — Combined earnings from services and product sales\n" +
      "• Service Revenue — Money earned from bookings\n" +
      "• Product Revenue — Money earned from shop orders\n" +
      "• Completed Bookings — Appointments successfully delivered\n" +
      "• New Customers — First-time clients acquired\n" +
      "• Avg Rating — Average client review score, with completion rate",
    position: "bottom",
  },
  {
    selector: '[data-tour="analytics-trend"]',
    content:
      "The Revenue Trend chart shows daily revenue as a bar graph across the selected " +
      "period. Hover over any bar to see the exact dollar amount earned that day — " +
      "useful for spotting your busiest days.",
    position: "top",
  },
  {
    selector: '[data-tour="analytics-invoices"]',
    content:
      "The Transactions / Invoices panel breaks down everything billed — total amount " +
      "invoiced, invoice count, HST collected, and a split by type (bookings, product " +
      "orders, gift cards, and manual charges).",
    position: "top",
  },
  {
    selector: '[data-tour="analytics-leaderboard"]',
    content:
      "The Worker Performance table ranks every technician by completed jobs and revenue " +
      "generated. You can also see their cancellation count and average client rating — " +
      "a quick way to spot your top performers.",
    position: "top",
  },
  {
    selector: '[data-tour="analytics-top-services"]',
    content:
      "Top Services shows which services are selling best in this period, ranked by " +
      "revenue, with a bar showing relative popularity against your best-seller.",
    position: "top",
  },
]
