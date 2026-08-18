import type { StepType } from "@reactour/tour"

export const adminEmployeesSteps: StepType[] = [
  {
    selector: '[data-tour="employees-header"]',
    content:
      "Welcome to Employees! This is where you manage staff profiles, shifts, dispatch " +
      "coverage areas, partner assignments, and performance KPIs — all in one place. " +
      "Click 'Add Staff' to onboard a new technician.",
    position: "bottom",
  },
  {
    selector: '[data-tour="employees-kpi-period"]',
    content:
      "Choose the time window for the performance KPIs shown on each staff card — " +
      "30 days, 90 days, this year, or all time.",
    position: "bottom",
  },
  {
    selector: '[data-tour="employees-list"]',
    content:
      "Each card is one staff member, showing their photo, name, title, email, and " +
      "shift status. From here you can:\n\n" +
      "• Toggle Shift — Manually clock them in or out\n" +
      "• Edit — Update their profile details\n" +
      "• Delete — Remove their login (use with caution)\n" +
      "• Partner — Assign them to an in-house or partner roster\n" +
      "• Service areas — Set which FSAs (postal code prefixes) they cover for dispatch\n" +
      "• Performance KPIs — Completed jobs, revenue, rating, and cancellations\n\n" +
      "Click 'View detailed KPIs' on any card for the full breakdown.",
    position: "top",
  },
  {
    selector: '[data-tour="employees-pagination"]',
    content:
      "Use Prev/Next to page through the full staff roster when it grows beyond one page.",
    position: "top",
  },
]
