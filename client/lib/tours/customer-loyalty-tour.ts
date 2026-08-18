import type { StepType } from "@reactour/tour"

export const customerLoyaltySteps: StepType[] = [
  {
    selector: '[data-tour="customer-loyalty-header"]',
    content:
      "Welcome to your Loyalty Program page! Earn points every time you book a service, " +
      "and redeem them toward future beauty appointments.",
    position: "bottom",
  },
  {
    selector: '[data-tour="customer-loyalty-metrics"]',
    content:
      "Your points at a glance:\n\n" +
      "• Points Balance — What you have available to redeem right now\n" +
      "• Points Earned — Your all-time total points earned\n" +
      "• Points Redeemed — Points you've already used",
    position: "bottom",
  },
  {
    selector: '[data-tour="customer-loyalty-referral"]',
    content:
      "Refer a Friend — Share your personal link with friends and family. When they " +
      "complete their first booking, you earn bonus points automatically. Click 'Copy' " +
      "to grab your link instantly.",
    position: "top",
  },
  {
    selector: '[data-tour="customer-loyalty-history"]',
    content:
      "Points History — A full record of every time you earned or redeemed points, with " +
      "the date and reason for each change.",
    position: "top",
  },
]
