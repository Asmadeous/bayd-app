import type { StepType } from "@reactour/tour"

export const adminLoyaltySteps: StepType[] = [
  {
    selector: '[data-tour="admin-loyalty-header"]',
    content:
      "Welcome to the Loyalty Program page! This is a read-only view of every customer's " +
      "reward points balance, so you can see how much loyalty value is outstanding.",
    position: "bottom",
  },
  {
    selector: '[data-tour="admin-loyalty-metrics"]',
    content:
      "Two quick totals at a glance:\n\n" +
      "• Total Accounts — How many customers have a loyalty account\n" +
      "• Points Outstanding — The combined points balance owed across all accounts",
    position: "bottom",
  },
  {
    selector: '[data-tour="admin-loyalty-table"]',
    content:
      "Every loyalty account, listed with the customer's name, email, current points " +
      "balance, and the date they joined the program. Use the pagination controls below " +
      "to browse through all accounts.",
    position: "top",
  },
]
