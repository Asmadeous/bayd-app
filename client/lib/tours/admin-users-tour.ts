import type { StepType } from "@reactour/tour"

export const adminUsersSteps: StepType[] = [
  {
    selector: '[data-tour="admin-users-header"]',
    content:
      "Welcome to Customers! This shows your registered customer accounts by default. " +
      "Employees have their own dedicated tab — use the role filter here if you ever need " +
      "to see employee or admin accounts from this same list.",
    position: "bottom",
  },
  {
    selector: '[data-tour="admin-users-filters"]',
    content:
      "Search for a specific account by email, or use the role dropdown to switch away " +
      "from the customers-only default and see employees, admins, or every role at once.",
    position: "bottom",
  },
  {
    selector: '[data-tour="admin-users-list"]',
    content:
      "Each row shows a user's name, email, role, and join date. Click 'Edit Role' to " +
      "change what an account can access (customer, employee, or admin), then 'Save' to " +
      "apply it. Use 'Delete' to permanently remove an account — you'll be asked to " +
      "confirm first.",
    position: "top",
  },
]
