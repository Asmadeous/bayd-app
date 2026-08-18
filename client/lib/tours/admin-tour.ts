import type { StepType } from "@reactour/tour"

export const adminDashboardSteps: StepType[] = [
  {
    selector: '[data-tour="sidebar"]',
    content:
      "Welcome to the Admin Command Center! The sidebar provides quick navigation " +
      "to all admin modules across Dashboard, People, Bookings, Workforce, Catalog, Commerce, Content, and Settings.",
    position: "right",
  },
  {
    selector: '[data-tour="admin-hero"]',
    content:
      "The Admin Hero banner gives you a quick snapshot of the platform status, " +
      "with primary actions to jump straight into the master calendar or view overall analytics.",
    position: "bottom",
  },
  {
    selector: '[data-tour="admin-metrics"]',
    content:
      "Key platform indicators:\n\n" +
      "• Total Bookings — System-wide total appointment volume\n" +
      "• Confirmed — Appointments booked & scheduled\n" +
      "• In Progress — Active appointments currently taking place\n" +
      "• Completed — Successfully delivered services",
    position: "bottom",
  },
  {
    selector: '[data-tour="admin-shortcuts"]',
    content:
      "Operations Shortcuts — Quick links to the main operational tools: " +
      "Calendar management, Booking details, Employee schedules, and Client inquiries.",
    position: "right",
  },
  {
    selector: '[data-tour="admin-recent-bookings"]',
    content:
      "Live Booking Feed — Real-time list of recent customer appointment submissions. " +
      "Click 'View all' to open the complete booking management queue.",
    position: "left",
  },
]
