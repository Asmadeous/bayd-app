import type { StepType } from "@reactour/tour"

export const customerSettingsSteps: StepType[] = [
  {
    selector: '[data-tour="customer-settings-header"]',
    content:
      "Welcome to your Account Settings! Keep your profile, contact details, and booking " +
      "preferences current so we can always reach you about your appointments.",
    position: "bottom",
  },
  {
    selector: '[data-tour="customer-settings-avatar"]',
    content:
      "Click here to choose a profile photo. A friendly photo makes your account feel " +
      "personal — it's optional, but a nice touch.",
    position: "right",
  },
  {
    selector: '[data-tour="customer-settings-form"]',
    content:
      "Update your first name, last name, and phone number here. Your email is shown but " +
      "can't be changed — it's how we identify your account. Turn on 'Beauty notes and " +
      "offers' if you'd like appointment inspiration and client-only offers by email. " +
      "Click 'Save Changes' when you're done.",
    position: "top",
  },
  {
    selector: '[data-tour="customer-settings-summary"]',
    content:
      "A quick summary card showing your name and email — a handy reminder of the " +
      "account you're signed in as.",
    position: "left",
  },
  {
    selector: '[data-tour="customer-settings-card-on-file"]',
    content:
      "Manage the payment card saved to your account here, so future bookings can be " +
      "charged quickly and securely.",
    position: "left",
  },
]
