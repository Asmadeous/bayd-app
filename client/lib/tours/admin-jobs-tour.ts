import type { StepType } from "@reactour/tour"

export const adminJobsSteps: StepType[] = [
  {
    selector: '[data-tour="admin-jobs-header"]',
    content:
      "Welcome to Jobs! This page manages the full hiring pipeline — the postings you " +
      "publish on the careers page, and the applications that come in for them.",
    position: "bottom",
  },
  {
    selector: '[data-tour="admin-jobs-tabs"]',
    content:
      "Switch between the two views here:\n\n" +
      "• Postings — Create and manage open roles (draft, published, or closed)\n" +
      "• Applications — Review candidates who applied to your postings",
    position: "bottom",
  },
  {
    selector: '[data-tour="admin-jobs-content"]',
    content:
      "In Postings, use the status filter to see draft, published, or closed roles, and " +
      "'New posting' to create one — set the title, department, location, employment type, " +
      "salary range, description, and requirements.\n\n" +
      "In Applications, filter by status (unread, reviewing, rejected, hired), read each " +
      "candidate's message, and download their attached résumé or cover letter once it " +
      "clears the malware scan.",
    position: "top",
  },
]
