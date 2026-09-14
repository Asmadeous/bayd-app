"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { usePathname } from "next/navigation"
import { useState } from "react"

import { RecommendPopup } from "@/components/recommend-popup"
import { useNativeShell } from "@/lib/native/use-native-shell"
import { usePushRegistration } from "@/lib/native/use-push-registration"
import { AnimatedSplash } from "@/lib/native/animated-splash"

// Runs native shell setup (status bar, splash, back button) + push registration.
// No-ops on the web.
function NativeShell() {
  useNativeShell()
  usePushRegistration()
  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  // The recommend popup is a website marketing surface; the purpose-built apps
  // (customer /app, staff /staff, admin /admin) never show it.
  const inApp = /^\/(app|staff|admin)(\/|$)/.test(pathname ?? "")

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30 * 1000, retry: 1, refetchOnWindowFocus: false },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <NativeShell />
      <AnimatedSplash />
      {children}
      {!inApp && <RecommendPopup />}
    </QueryClientProvider>
  )
}
