import type { StepType } from "@reactour/tour"

export const customerAddressesSteps: StepType[] = [
  {
    selector: '[data-tour="customer-addresses-header"]',
    content:
      "Welcome to your Addresses page! This is where you save the locations where you'd " +
      "like your mobile beauty appointments to happen — home, work, or anywhere else.",
    position: "bottom",
  },
  {
    selector: '[data-tour="customer-addresses-add"]',
    content:
      "Tap 'Add Address' to save a new service location. Having your addresses saved " +
      "makes booking faster next time — no need to retype your details.",
    position: "bottom",
  },
  {
    selector: '[data-tour="customer-addresses-form"]',
    content:
      "Fill in a friendly label (like 'Home' or 'Office'), your street address, city, " +
      "province, and postal code. Click 'Save Address' when you're done.",
    position: "top",
  },
  {
    selector: '[data-tour="customer-addresses-list"]',
    content:
      "Your saved addresses appear here. Each one shows the label and full address. " +
      "Use 'Set Default' to make an address your go-to choice at checkout, or " +
      "'Remove' to delete an address you no longer need.",
    position: "top",
  },
]
