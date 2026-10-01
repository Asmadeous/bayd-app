"use client"

import { Suspense } from "react"

import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardPage } from "@/components/dashboard/dashboard-page"
import { DashboardPanel } from "@/components/dashboard/dashboard-panel"
import { MessagesInbox } from "@/components/dashboard/messages-inbox"

export default function EmployeeMessagesPage() {
  return (
    <DashboardPage>
      <DashboardHeader title="Messages" subtitle="Chat with your clients and the B.A.Y.D team." />
      <DashboardPanel>
        {/* useSearchParams needs a Suspense boundary for the static export. */}
        <Suspense>
          <MessagesInbox showSafety />
        </Suspense>
      </DashboardPanel>
    </DashboardPage>
  )
}
