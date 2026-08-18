import type { StepType } from "@reactour/tour"

export const adminInquiriesSteps: StepType[] = [
  {
    selector: '[data-tour="admin-inquiries-header"]',
    content:
      "Welcome to Inquiries! This page collects every message submitted through the " +
      "public site's contact, franchise, and job-interest forms so you never miss a lead.",
    position: "bottom",
  },
  {
    selector: '[data-tour="admin-inquiries-tabs"]',
    content:
      "Switch between the three inquiry types here:\n\n" +
      "• Contacts — General website contact form submissions\n" +
      "• Franchise — People interested in franchising with B.A.Y.D\n" +
      "• Jobs — Career interest submitted outside the formal job application flow",
    position: "bottom",
  },
  {
    selector: '[data-tour="admin-inquiries-list"]',
    content:
      "Each card shows the full details submitted with that inquiry — name, contact info, " +
      "and message — along with the date it came in. Scroll through to review every " +
      "submission, and use the pagination controls below to see older inquiries.",
    position: "top",
  },
]
