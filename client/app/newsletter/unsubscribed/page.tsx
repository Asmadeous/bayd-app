import { Suspense } from "react"
import type { Metadata } from "next"

import { SiteFooter } from "@/components/layout/site-footer"
import { SiteHeader } from "@/components/layout/site-header"
import { UnsubscribedMessage } from "./unsubscribed-message"

export const metadata: Metadata = {
  title: "Unsubscribed",
  robots: { index: false, follow: false },
}

// Where the newsletter's unsubscribe link lands after the API has removed the
// address (or found the link invalid).
export default function NewsletterUnsubscribedPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-16 text-[#14100F] md:py-24">
        <Suspense>
          <UnsubscribedMessage />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  )
}
