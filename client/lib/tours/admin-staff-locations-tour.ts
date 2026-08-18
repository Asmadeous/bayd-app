import type { StepType } from "@reactour/tour"

export const adminStaffLocationsSteps: StepType[] = [
  {
    selector: '[data-tour="admin-staff-locations-header"]',
    content:
      "Welcome to Staff Locations! This page shows where your mobile technicians are " +
      "right now, how far they've travelled, and what fuel compensation they've earned " +
      "so far today.",
    position: "bottom",
  },
  {
    selector: '[data-tour="admin-staff-locations-map"]',
    content:
      "The Live Map shows a pin for every technician currently reporting a location. The " +
      "map refreshes automatically every 30 seconds, so pins move as staff travel between " +
      "appointments.",
    position: "bottom",
  },
  {
    selector: '[data-tour="admin-staff-locations-table"]',
    content:
      "This table lists every technician with their current shift status (On shift or " +
      "Off), the time their location was last updated, total distance travelled, and fuel " +
      "owed. The bottom row totals the fuel compensation across the whole team.",
    position: "top",
  },
]
