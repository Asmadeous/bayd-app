import type { StepType } from "@reactour/tour"

export const adminServiceAreasSteps: StepType[] = [
  {
    selector: '[data-tour="admin-service-areas-header"]',
    content:
      "Welcome to Service Areas! This page controls which parts of the GTA the mobile " +
      "team will travel to, what travel fee applies in each zone, and where bookings are " +
      "blocked entirely.",
    position: "bottom",
  },
  {
    selector: '[data-tour="admin-service-areas-list"]',
    content:
      "Each card is one service area. It shows the zone name, whether it's active, the " +
      "travel fee charged for bookings there, and its boundary — a circular zone defined " +
      "by a center point (latitude/longitude) and a radius in kilometres.\n\n" +
      "Click 'Edit' on any zone to update its name, travel fee, active status, or " +
      "boundary. Leaving the boundary fields blank means that zone serves everywhere. " +
      "Addresses that fall outside every active zone won't be able to book.",
    position: "top",
  },
]
