import type { StepType } from "@reactour/tour"

export const adminGiftCardsSteps: StepType[] = [
  {
    selector: '[data-tour="admin-giftcards-header"]',
    content:
      "Welcome to Gift Cards! From here you can issue new gift cards, send them to " +
      "recipients by email, top up balances, and manage every card in the system. " +
      "Click 'Issue card' to create a new one.",
    position: "bottom",
  },
  {
    selector: '[data-tour="admin-giftcards-filters"]',
    content:
      "Filter the list below by card status — 'All', 'Active' (usable), or 'Disabled' " +
      "(deactivated cards that can no longer be redeemed).",
    position: "bottom",
  },
  {
    selector: '[data-tour="admin-giftcards-form"]',
    content:
      "The Issue Card form appears here. Fill in the dollar amount, an optional " +
      "expiration date, and recipient details (email, name, sender name, gift message). " +
      "The card code is auto-generated (BAYD-…) — if you add a recipient email, the card " +
      "is emailed automatically once issued.",
    position: "top",
  },
  {
    selector: '[data-tour="admin-giftcards-grid"]',
    content:
      "Every gift card in the system, shown as a visual card with its balance, recipient, " +
      "and status. Use the icons to send/resend the card by email, enable or disable it, " +
      "or delete it. You can also record a manual top-up here when a client pays in " +
      "person by cash, card, or POS.",
    position: "top",
  },
]
