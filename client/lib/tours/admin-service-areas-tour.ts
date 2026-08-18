import type { StepType } from "@reactour/tour"

export const adminServiceAreasSteps: StepType[] = [
  {
    selector: '[data-tour="admin-service-areas-header"]',
    content:
      "Welcome to Service Areas! This shows the REAL coverage map — built from each " +
      "technician's postal-code (FSA) list, which is what actually decides whether a " +
      "booking can be accepted. To change coverage, edit an FSA list on a tech's profile " +
      "(Dashboard → Employees), not from this page.",
    position: "bottom",
  },
  {
    selector: '[data-tour="admin-service-areas-metrics"]',
    content:
      "A quick summary: how many distinct FSAs (postal-code zones) are covered in " +
      "total, and how many technicians have at least one FSA assigned.",
    position: "bottom",
  },
  {
    selector: '[data-tour="admin-service-areas-list"]',
    content:
      "Each row is one FSA (e.g. \"L5L\") with the technician(s) who cover it. If an " +
      "address's FSA doesn't appear here at all, a booking there will be rejected as " +
      "out of coverage.",
    position: "top",
  },
]
