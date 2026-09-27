"use client"

import { Bell } from "lucide-react"

import { MarkAllReadButton } from "@/components/notifications/mark-all-read"
import { NotificationList } from "@/components/notifications/notification-list"
import { cardClass } from "../app-theme"
import { EmptyState } from "../empty-state"
import { SectionScreen } from "../section-screen"

export default function AppNotificationsScreen() {
  return (
    <SectionScreen title="Notifications">
      <MarkAllReadButton />
      <NotificationList
        app="customer"
        cardClassName={cardClass}
        empty={<EmptyState icon={Bell} title="You're all caught up" text="Booking updates and reminders will appear here." />}
      />
    </SectionScreen>
  )
}
