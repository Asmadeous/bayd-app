import type { StepType } from "@reactour/tour"

export const customerDashboardSteps: StepType[] = [
  {
    selector: '[data-tour="sidebar"]',
    content:
      "Welcome to your Customer Dashboard! Use the sidebar to view your Calendar, Subscriptions, Notifications, Saved Addresses, Loyalty Points, Gift Cards, Orders, Transactions, and Account Settings.",
    position: "right",
  },
  {
    selector: '[data-tour="customer-hero"]',
    content:
      "Your Customer Hero overview shows your next upcoming appointment and gives you a one-click button to book a new mobile beauty service.",
    position: "bottom",
  },
  {
    selector: '[data-tour="customer-metrics"]',
    content:
      "Your summary metrics:\n\n" +
      "• Upcoming — Appointments scheduled for the future\n" +
      "• Completed — Your past beauty sessions\n" +
      "• Total Bookings — All-time total appointments booked\n" +
      "• Loyalty Points — Rewards balance",
    position: "bottom",
  },
  {
    selector: '[data-tour="customer-calendar"]',
    content:
      "Interactive Calendar — Select any date to check availability or view scheduled appointments for that specific day.",
    position: "right",
  },
  {
    selector: '[data-tour="customer-upcoming"]',
    content:
      "Upcoming Appointments list — Shows details, date/time, price, and status for your upcoming mobile appointments.",
    position: "left",
  },
]
