import type { StepType } from "@reactour/tour"

export const customerGiftCardsSteps: StepType[] = [
  {
    selector: '[data-tour="customer-giftcards-header"]',
    content:
      "Welcome to your Gift Cards page! Here you'll find every gift card you've purchased " +
      "or received, ready to use toward your next beauty appointment.",
    position: "bottom",
  },
  {
    selector: '[data-tour="customer-giftcards-list"]',
    content:
      "Each gift card shows its balance, code, and expiry date. If a card was sent to " +
      "someone by email, you'll see who received it and whether it's been delivered yet.",
    position: "top",
  },
  {
    selector: '[data-tour="customer-giftcards-topup"]',
    content:
      "Want to add more funds to a card? Enter an amount here and click 'Add funds' to " +
      "top it up securely — the new balance appears once payment clears.",
    position: "top",
  },
]
