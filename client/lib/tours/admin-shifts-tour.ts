import type { StepType } from "@reactour/tour"

export const adminShiftsSteps: StepType[] = [
  {
    selector: '[data-tour="admin-shifts-header"]',
    content:
      "Welcome to Fuel Compensation! This page tracks every staff shift across the team " +
      "— when they clocked in, how far they travelled, and how much fuel reimbursement " +
      "is owed to them.",
    position: "bottom",
  },
  {
    selector: '[data-tour="admin-shifts-filters"]',
    content:
      "Narrow the shift list down using these filters:\n\n" +
      "• Employee — show shifts for one team member only\n" +
      "• Status — 'On shift' for currently active shifts, 'Closed' for finished ones\n" +
      "• From / To — restrict results to a specific date range\n\n" +
      "A 'Clear' button appears once any filter is active.",
    position: "bottom",
  },
  {
    selector: '[data-tour="admin-shifts-stats"]',
    content:
      "These totals summarise the currently filtered shifts:\n\n" +
      "• Shifts — how many shift records match your filters\n" +
      "• Total Distance — combined kilometres travelled\n" +
      "• Total Owed — combined fuel reimbursement owed across those shifts",
    position: "bottom",
  },
  {
    selector: '[data-tour="admin-shifts-list"]',
    content:
      "Each row is one shift — the employee, clock-in and clock-out times, duration, " +
      "distance driven, and the fuel reimbursement amount. Shifts still in progress show " +
      "an 'On Shift' badge instead of a clock-out time. Use the trash icon to permanently " +
      "delete an incorrect shift record.",
    position: "top",
  },
]
