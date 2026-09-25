"use client"

import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardPage } from "@/components/dashboard/dashboard-page"
import { AdminBookingCalendar } from "@/components/dashboard/role-booking-calendars"
import { TutorialButton } from "@/components/dashboard/tutorial-button"
import { adminCalendarSteps } from "@/lib/tours/admin-calendar-tour"

export default function AdminCalendarPage() {
  return (
    <DashboardPage maxWidth="wide">
      <div data-tour="calendar-header">
        <DashboardHeader
          title="Company Calendar"
          subtitle="Every booking across the business. Click an appointment to manage it, or an empty time to book one."
        />
      </div>
      <div data-tour="calendar-grid">
        <AdminBookingCalendar />
      </div>
      <TutorialButton steps={adminCalendarSteps} pageKey="admin-calendar" />
    </DashboardPage>
  )
}
