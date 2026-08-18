import type { StepType } from "@reactour/tour"

export const adminReviewsSteps: StepType[] = [
  {
    selector: '[data-tour="admin-reviews-header"]',
    content:
      "Welcome to the Reviews page! This is where you moderate the star ratings and " +
      "written feedback customers leave for your technicians before they go public.",
    position: "bottom",
  },
  {
    selector: '[data-tour="admin-reviews-filter"]',
    content:
      "Use these filter tabs to switch between 'all' reviews, 'pending' reviews awaiting " +
      "your approval, and 'approved' reviews that are already visible to the public.",
    position: "bottom",
  },
  {
    selector: '[data-tour="admin-reviews-list"]',
    content:
      "Each review card shows the star rating, the customer's name, which technician it " +
      "was written for, and the written comment. Reviews that haven't been approved yet " +
      "show an 'Approve' button — click it to publish the review. Approved reviews are " +
      "marked with an 'approved' badge.",
    position: "top",
  },
]
