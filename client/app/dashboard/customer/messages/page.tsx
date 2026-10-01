"use client"

import { Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"

import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardPage } from "@/components/dashboard/dashboard-page"
import { DashboardPanel } from "@/components/dashboard/dashboard-panel"
import { DashboardToolbar, SegmentedControl, SegmentButton, ToolbarSection } from "@/components/dashboard/dashboard-toolbar"
import { MessagesInbox } from "@/components/dashboard/messages-inbox"
import { SupportChatPanel } from "@/components/dashboard/support-chat-panel"

export default function CustomerMessagesPage() {
  return (
    <DashboardPage>
      <DashboardHeader title="Messages" subtitle="Chat with your technician, or ask the B.A.Y.D team for help." />
      {/* useSearchParams needs a Suspense boundary for the static export. */}
      <Suspense>
        <MessagesTabs />
      </Suspense>
    </DashboardPage>
  )
}

// Like the app's Chat tab: conversations with technicians, and Support with
// the team. ?tab=support opens Support directly.
function MessagesTabs() {
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<"messages" | "support">(searchParams.get("tab") === "support" ? "support" : "messages")

  return (
    <>
      <DashboardToolbar>
        <ToolbarSection>
          <SegmentedControl>
            <SegmentButton active={tab === "messages"} onClick={() => setTab("messages")}>
              Messages
            </SegmentButton>
            <SegmentButton active={tab === "support"} onClick={() => setTab("support")}>
              Support
            </SegmentButton>
          </SegmentedControl>
        </ToolbarSection>
      </DashboardToolbar>
      <DashboardPanel>{tab === "messages" ? <MessagesInbox showSafety /> : <SupportChatPanel />}</DashboardPanel>
    </>
  )
}
