import type { StepType } from "@reactour/tour"

/**
 * Comprehensive guided tour steps for the Employee (Staff) Dashboard.
 *
 * Each step targets a `data-tour` attribute placed on key UI elements.
 * Steps are ordered to follow the natural reading flow of the dashboard:
 *   sidebar → hero → metrics → toolbar → schedule/calendar → sub-pages.
 */

// ─── Main dashboard (Schedule page) ─────────────────────────────────

export const employeeDashboardSteps: StepType[] = [
  // ── Sidebar & Navigation ──────────────────────────────────────────
  {
    selector: '[data-tour="sidebar"]',
    content:
      "Welcome to your Staff Dashboard! This is the sidebar navigation — your command centre. " +
      "From here you can jump to your Schedule, Shifts, Gift Cards, Profile, and Reviews. " +
      "The active page is always highlighted in pink.",
    position: "right",
  },
  {
    selector: '[data-tour="sidebar-brand"]',
    content:
      "This is the BAYD Studio Desk brand mark. Click it any time to return to the main " +
      "dashboard overview. Your current role badge (Employee) is shown beside it.",
    position: "right",
  },
  {
    selector: '[data-tour="sidebar-profile"]',
    content:
      "Your account summary — name, email, and avatar. This is the identity you're logged " +
      "in as. If anything looks wrong, visit your Profile page to update it.",
    position: "right",
  },
  {
    selector: '[data-tour="sidebar-nav"]',
    content:
      "These are your main navigation links:\n\n" +
      "• Schedule — Today's assigned bookings and calendar\n" +
      "• Shifts — Clock-in history and fuel reimbursements\n" +
      "• Gift Cards — Look up and top-up client gift cards\n" +
      "• Profile — Update your professional bio and photo\n" +
      "• Reviews — Read feedback from past clients",
    position: "right",
  },
  {
    selector: '[data-tour="sidebar-signout"]',
    content:
      "When you're done for the day, click 'Sign out' here to securely log out of your " +
      "session. Always sign out when using a shared device.",
    position: "right",
  },

  // ── Hero section ──────────────────────────────────────────────────
  {
    selector: '[data-tour="employee-hero"]',
    content:
      "This is the Hero Banner — a quick status snapshot of your shift. " +
      "When you're on shift it says 'You are live for appointments.' " +
      "When off shift it reminds you to start when ready.",
    position: "bottom",
  },
  {
    selector: '[data-tour="employee-new-booking"]',
    content:
      "The 'New Booking' button lets you manually create a walk-in or phone-in appointment. " +
      "You'll fill in the client's details, service, date/time, and address — " +
      "it goes straight onto your schedule.",
    position: "bottom",
  },
  {
    selector: '[data-tour="employee-shift-toggle"]',
    content:
      "This is the Shift Toggle — the most important button on your dashboard. " +
      "Tap 'Start Shift' to clock in and go live for appointments. " +
      "When you're done, tap 'End Shift' to clock out. " +
      "Your shift hours and travel distance are automatically tracked for fuel reimbursement.",
    position: "bottom",
  },
  {
    selector: '[data-tour="employee-next-appointment"]',
    content:
      "The Next Appointment card shows your immediately upcoming booking at a glance — " +
      "the service name, date, and time. Use this to plan your travel. " +
      "If nothing is scheduled, you'll see a friendly 'no upcoming' message.",
    position: "left",
  },

  // ── Metric cards ──────────────────────────────────────────────────
  {
    selector: '[data-tour="employee-metrics"]',
    content:
      "These four Metric Cards give you a real-time overview of your workday:\n\n" +
      "• On Shift — Whether you're currently clocked in (Yes/No)\n" +
      "• Upcoming — Count of confirmed/pending appointments ahead\n" +
      "• In Progress — Appointments you're actively working on\n" +
      "• Total Bookings — Your overall booking count for the period",
    position: "bottom",
  },

  // ── Toolbar & View toggle ─────────────────────────────────────────
  {
    selector: '[data-tour="employee-toolbar"]',
    content:
      "The View Toolbar lets you switch between List view and Calendar view. " +
      "List view shows bookings as cards sorted by date. " +
      "Calendar view shows a month grid so you can plan your week visually. " +
      "The count of assigned appointments is shown on the right.",
    position: "bottom",
  },

  // ── Schedule area ─────────────────────────────────────────────────
  {
    selector: '[data-tour="employee-schedule"]',
    content:
      "This is your Schedule Area — where your bookings appear. " +
      "Each booking card shows the service name, status, date/time, assigned tech, price, " +
      "and any special notes. You can also see recurrence badges for repeat clients.\n\n" +
      "In Calendar view, click any day to filter the side panel to that date's bookings.",
    position: "top",
  },
]

// ─── Shifts page ────────────────────────────────────────────────────

export const employeeShiftsSteps: StepType[] = [
  {
    selector: '[data-tour="shifts-header"]',
    content:
      "Welcome to your Shifts page! This is where you review your entire clock-in/out " +
      "history — every shift you've worked, the distance you've travelled, and your " +
      "fuel reimbursement totals.",
    position: "bottom",
  },
  {
    selector: '[data-tour="shifts-stats"]',
    content:
      "These stat cards summarise your shift data:\n\n" +
      "• Total Shifts — How many shifts you've completed\n" +
      "• Distance Travelled — Total kilometres driven to client locations\n" +
      "• Fuel Reimbursement — Dollar amount owed to you for travel",
    position: "bottom",
  },
  {
    selector: '[data-tour="shifts-list"]',
    content:
      "Each shift row shows the clock-in time, shift status (On Shift or Closed), " +
      "duration, distance driven, and fuel payout. Scroll through to review your " +
      "complete work history and verify your reimbursement amounts.",
    position: "top",
  },
]

// ─── Gift Cards page ────────────────────────────────────────────────

export const employeeGiftCardsSteps: StepType[] = [
  {
    selector: '[data-tour="giftcards-header"]',
    content:
      "The Gift Card Top-Up page lets you look up a client's gift card " +
      "by its code and add funds when they pay in person.",
    position: "bottom",
  },
  {
    selector: '[data-tour="giftcards-lookup"]',
    content:
      "Enter the gift card code (e.g. BAYD-XXXX-XXXX) and click 'Look up' to " +
      "pull up the card details. If the code doesn't exist, you'll get an error message.",
    position: "bottom",
  },
  {
    selector: '[data-tour="giftcards-topup"]',
    content:
      "Once the card is found, you'll see the card visual with the current balance. " +
      "Enter the amount the client paid, select the payment method (POS, Card, or Cash), " +
      "and click 'Mark paid' to add the funds.",
    position: "bottom",
  },
]

// ─── Profile page ───────────────────────────────────────────────────

export const employeeProfileSteps: StepType[] = [
  {
    selector: '[data-tour="profile-header"]',
    content:
      "Your Profile page is where you manage the professional image clients see when " +
      "browsing the booking page. Keep it polished and up-to-date!",
    position: "bottom",
  },
  {
    selector: '[data-tour="profile-card"]',
    content:
      "This sidebar card shows your photo, name, email, shift status, title, and " +
      "years of experience. Think of it as your public-facing business card.",
    position: "right",
  },
  {
    selector: '[data-tour="profile-form"]',
    content:
      "Use this form to update your professional photo, title (e.g. 'Senior Nail Technician'), " +
      "and bio paragraph. Click 'Save Profile' when you're happy with the changes. " +
      "A green 'Saved' badge confirms the update went through.",
    position: "left",
  },
]

// ─── Reviews page ───────────────────────────────────────────────────

export const employeeReviewsSteps: StepType[] = [
  {
    selector: '[data-tour="reviews-header"]',
    content:
      "The Reviews page shows feedback that clients have left about your service. " +
      "Use this to track your quality and spot areas for improvement.",
    position: "bottom",
  },
  {
    selector: '[data-tour="reviews-metrics"]',
    content:
      "These metric cards summarise your review stats:\n\n" +
      "• Avg Rating — Your average star rating across all reviews\n" +
      "• Total Reviews — Number of reviews received\n" +
      "• 5-Star Reviews — Count of perfect-score reviews",
    position: "bottom",
  },
  {
    selector: '[data-tour="reviews-list"]',
    content:
      "Each review card shows the client's name, star rating, date, and their written " +
      "feedback. Scroll through to read every comment. Use the pagination at the bottom " +
      "to navigate through older reviews.",
    position: "top",
  },
]

// ─── New Booking page ───────────────────────────────────────────────

export const employeeNewBookingSteps: StepType[] = [
  {
    selector: '[data-tour="new-booking-header"]',
    content:
      "The New Booking form lets you manually create an appointment for a walk-in or " +
      "phone-in client. This booking goes straight onto your schedule.",
    position: "bottom",
  },
  {
    selector: '[data-tour="new-booking-form"]',
    content:
      "Fill in all the required fields:\n\n" +
      "• Service — Select from the service catalogue\n" +
      "• Client Type — Adult, Kids, Elderly, or Group\n" +
      "• Client Details — Name, email (required), and phone\n" +
      "• Date & Time — When the appointment takes place\n" +
      "• Address — Where you'll be travelling to provide the service\n" +
      "• Notes — Any special instructions from the client\n\n" +
      "Click 'Create booking' when everything looks good!",
    position: "top",
  },
]
