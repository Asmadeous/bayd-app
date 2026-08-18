import type { StepType } from "@reactour/tour"

export const adminServicesSteps: StepType[] = [
  {
    selector: '[data-tour="admin-services-header"]',
    content:
      "Welcome to the Services page! This is the master catalog of every beauty service " +
      "customers can book — nails, lashes, and everything in between.",
    position: "bottom",
  },
  {
    selector: '[data-tour="admin-services-add"]',
    content:
      "Click 'Add Service' to open the editor and create a brand-new bookable service. " +
      "You'll set its name, price, duration, category, and more before it appears on the " +
      "booking page.",
    position: "bottom",
  },
  {
    selector: '[data-tour="admin-services-editor"]',
    content:
      "The Service Editor appears here whenever you're creating or editing a service:\n\n" +
      "• Name, Price, and Duration — the core booking fields\n" +
      "• Category — which section of the service menu it belongs to\n" +
      "• Image URL — the photo shown on the booking page\n" +
      "• SimplyBook Service ID — links this service to its SimplyBook counterpart for sync\n" +
      "• Active toggle — controls whether customers can book it\n" +
      "• Description — the write-up customers see when browsing\n" +
      "• Price tiers — optional Kids, Elderly, and Group pricing overrides\n\n" +
      "Click 'Create' or 'Save' to apply your changes, or 'Cancel' to discard.",
    position: "top",
  },
  {
    selector: '[data-tour="admin-services-stats"]',
    content:
      "This bar shows a quick catalog summary — the total number of services and how " +
      "many are currently active and bookable.",
    position: "bottom",
  },
  {
    selector: '[data-tour="admin-services-list"]',
    content:
      "The Service Library table lists every service with its category, price (including " +
      "any special tier pricing), duration, and status. Use 'Edit' to update details, or " +
      "'Delete' to permanently remove a service — you'll be asked to confirm first.",
    position: "top",
  },
]
