import type { StepType } from "@reactour/tour"

export const adminSettingsSteps: StepType[] = [
  {
    selector: '[data-tour="admin-settings-header"]',
    content:
      "Welcome to Settings! This is where you manage your own admin profile, plus " +
      "platform-wide configuration for booking and payment behaviour across the business.",
    position: "bottom",
  },
  {
    selector: '[data-tour="admin-settings-profile"]',
    content:
      "My Profile — update your own name and phone number here (email is fixed to your " +
      "login and can't be changed). Click 'Save Changes' and a confirmation appears once " +
      "it's applied.",
    position: "bottom",
  },
  {
    selector: '[data-tour="admin-settings-deposit"]',
    content:
      "Group Booking Deposit controls the percentage of the total price that's collected " +
      "upfront when a customer books a group service. Update the percentage and click " +
      "'Save' to apply it — a confirmation message appears once it's saved.",
    position: "top",
  },
]
