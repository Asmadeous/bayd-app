"use client"

import { Bell } from "lucide-react"

import { MarkAllReadButton } from "@/components/notifications/mark-all-read"
import { NotificationList } from "@/components/notifications/notification-list"
import { staffScreenClass, cardClass, mutedClass } from "../staff-theme"
import { StaffHeader } from "../staff-header"

export default function StaffNotificationsScreen() {
  return (
    <div className={staffScreenClass}>
      <StaffHeader title="Notifications" back />
      <div className="px-5">
        <MarkAllReadButton />
        <NotificationList
          app="staff"
          cardClassName={cardClass}
          empty={
            <div className={`${cardClass} flex flex-col items-center gap-2 p-8 text-center`}>
              <Bell className="size-7 text-[#C96C83]" aria-hidden />
              <p className="font-bold">You&apos;re all caught up</p>
              <p className={`text-sm ${mutedClass}`}>New jobs, changes and reminders appear here.</p>
            </div>
          }
        />
      </div>
    </div>
  )
}
