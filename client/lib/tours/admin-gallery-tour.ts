import type { StepType } from "@reactour/tour"

export const adminGallerySteps: StepType[] = [
  {
    selector: '[data-tour="admin-gallery-header"]',
    content:
      "Welcome to the Gallery manager! This is where you curate the photos shown on the " +
      "public gallery page — finished nail, lash, massage, pedicure, and waxing work. " +
      "Click '+ Add Item' to upload a new photo.",
    position: "bottom",
  },
  {
    selector: '[data-tour="admin-gallery-filters"]',
    content:
      "Use these category tabs to filter the gallery grid below — Lashes, Nails, Massage, " +
      "Pedicure, or Waxing. Select 'All' to see every photo across categories.",
    position: "bottom",
  },
  {
    selector: '[data-tour="admin-gallery-form"]',
    content:
      "The Add/Edit form appears here when creating or updating a photo:\n\n" +
      "• Image — Drag & drop or click to upload a finished-look photo\n" +
      "• Title & Alt Text — Name shown to clients and accessibility description\n" +
      "• Category & Size — Which service type and grid tile size (standard, wide, tall)\n" +
      "• Position — Sort order within the public gallery\n" +
      "• Featured / Active — Highlight the photo or hide it from public view\n\n" +
      "Click 'Add to Gallery' or 'Save Changes' when you're done.",
    position: "top",
  },
  {
    selector: '[data-tour="admin-gallery-grid"]',
    content:
      "This is the Gallery Grid — every photo currently uploaded. Hover over a photo to " +
      "reveal Edit and Delete actions. 'Featured' and 'Hidden' badges appear in the top-left " +
      "corner so you can quickly spot highlighted or unpublished items.",
    position: "top",
  },
]
