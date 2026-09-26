"use client"

import { Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { AppHeader } from "../app-header"
import { appScreenClass } from "../app-theme"
import { MessagesList } from "../messages/page"
import { SegmentedTabs } from "../segmented-tabs"
import { SupportChat } from "../support/page"

const SECTIONS = [
  { key: "messages", label: "Messages" },
  { key: "support", label: "Support" },
] as const
type Section = (typeof SECTIONS)[number]["key"]

// The Chat tab: conversations with technicians, and the support chat with the
// team. The choice lives in the URL (?tab=) so Back returns to it.
// useSearchParams needs a Suspense boundary for the static app export.
export default function ChatScreen() {
  return (
    <Suspense>
      <Chat />
    </Suspense>
  )
}

function Chat() {
  const router = useRouter()
  const param = useSearchParams().get("tab")
  const section: Section = param === "support" ? "support" : "messages"

  return (
    <div className={appScreenClass}>
      <AppHeader title="Chat" />
      <div className="px-5">
        <SegmentedTabs tabs={SECTIONS} value={section} onChange={(key) => router.replace(`/app/chat?tab=${key}`)} />
        {section === "messages" ? (
          <MessagesList />
        ) : (
          // Fills the space between the switch and the tab bar.
          <SupportChat className="h-[calc(100dvh-13.5rem-var(--top-inset)-env(safe-area-inset-bottom))]" />
        )}
      </div>
    </div>
  )
}
