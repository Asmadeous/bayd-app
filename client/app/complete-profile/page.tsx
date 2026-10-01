import { Suspense } from "react"
import type { Metadata } from "next"

import { SiteFooter } from "@/components/layout/site-footer"
import { SiteHeader } from "@/components/layout/site-header"
import { CompleteProfileForm } from "./complete-profile-form"

export const metadata: Metadata = {
  title: "Finish your account",
  robots: { index: false, follow: false },
}

export default function CompleteProfilePage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-xl px-4 py-12 md:py-16">
        <Suspense>
          <CompleteProfileForm />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  )
}
