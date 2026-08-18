import type { StepType } from "@reactour/tour"

export const adminMeetingsSteps: StepType[] = [
  {
    selector: '[data-tour="admin-meetings-header"]',
    content:
      "Welcome to Work-Scope Calls! This page tracks video consultations booked between " +
      "customers and staff — used to scope out a job before it's confirmed.",
    position: "bottom",
  },
  {
    selector: '[data-tour="admin-meetings-filters"]',
    content:
      "Filter calls by status — Scheduled, Completed, or Cancelled — using these tabs. " +
      "The count of calls currently shown appears on the right.",
    position: "bottom",
  },
  {
    selector: '[data-tour="admin-meetings-list"]',
    content:
      "Each row is a work-scope call, showing the linked booking number, its status, " +
      "the scheduled date/time, and the video provider used. Click 'Open room' to join or " +
      "review the call, or delete a call that's no longer needed.",
    position: "top",
  },
]
