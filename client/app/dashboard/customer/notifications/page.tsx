"use client"

import { NotificationsCenter } from "@/components/dashboard/notifications-center"
import { customerNotificationsSteps } from "@/lib/tours/customer-notifications-tour"

export default function CustomerNotificationsPage() {
  return (
    <NotificationsCenter
      emptyDescription="Booking updates, receipts, and account notices will appear here."
      tour={{ steps: customerNotificationsSteps, pageKey: "customer-notifications" }}
    />
  )
}
