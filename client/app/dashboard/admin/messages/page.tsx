"use client"

import { Suspense } from "react"

import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardPage } from "@/components/dashboard/dashboard-page"
import { DashboardPanel } from "@/components/dashboard/dashboard-panel"
import { MessagesInbox } from "@/components/dashboard/messages-inbox"

export default function AdminMessagesPage() {
  return (
    <DashboardPage>
      <DashboardHeader title="Messages" subtitle="Conversations you started from Customers or Employees, and their replies." />
      <DashboardPanel>
        {/* useSearchParams needs a Suspense boundary for the static export. */}
        <Suspense>
          <MessagesInbox showSafety={false} />
        </Suspense>
      </DashboardPanel>
    </DashboardPage>
  )
}
