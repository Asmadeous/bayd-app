import type { StepType } from "@reactour/tour"

export const adminPartnersSteps: StepType[] = [
  {
    selector: '[data-tour="admin-partners-header"]',
    content:
      "Welcome to Partners! This page manages partner businesses that supply technicians " +
      "and coverage into the B.A.Y.D provider pool. Click 'Add Partner' to onboard a new one.",
    position: "bottom",
  },
  {
    selector: '[data-tour="admin-partners-info"]',
    content:
      "A quick reminder of how the payout model works: B.A.Y.D collects payment from " +
      "customers and holds the funds. Each partner earns their share of completed bookings " +
      "after the platform fee is deducted. You settle what's owed into a payout, then mark " +
      "it paid once the money is actually sent.",
    position: "bottom",
  },
  {
    selector: '[data-tour="admin-partners-form"]',
    content:
      "The Partner editor appears here when adding or editing a partner. Set their name, " +
      "platform fee percentage, contact email and phone, active/inactive status, and any " +
      "payout notes (like an e-transfer email or bank reference).",
    position: "top",
  },
  {
    selector: '[data-tour="admin-partners-list"]',
    content:
      "Every partner is listed here with their provider count, covered FSAs, platform fee, " +
      "and what's currently owed to them. Click 'Details' to expand a partner and see their " +
      "assigned providers, settle a payout, view payout history, and mark payouts as paid.",
    position: "top",
  },
]
