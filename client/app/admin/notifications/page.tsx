"use client"

import { Bell } from "lucide-react"

import { MarkAllReadButton } from "@/components/notifications/mark-all-read"
import { NotificationList } from "@/components/notifications/notification-list"
import { AdminHeader } from "../admin-header"
import { adminScreenClass, cardClass, mutedClass } from "../admin-theme"

// The web Notifications page. Tapping an alert marks it read and opens what
// it's about (the booking, the chat report, the support chat).
export default function AdminNotificationsScreen() {
  return (
    <div className={adminScreenClass}>
      <AdminHeader title="Notifications" />
      <div className="px-5">
        <MarkAllReadButton />
        <NotificationList
          app="admin"
          cardClassName={cardClass}
          empty={
            <div className={`${cardClass} flex flex-col items-center gap-2 p-8 text-center`}>
              <Bell className="size-7 text-[#C96C83]" aria-hidden />
              <p className="font-bold">You&apos;re all caught up</p>
              <p className={`text-sm ${mutedClass}`}>Chat reports, missed jobs, staff cancellations and other alerts will appear here.</p>
            </div>
          }
        />
      </div>
    </div>
  )
}
