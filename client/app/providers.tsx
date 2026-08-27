"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"

import { RecommendPopup } from "@/components/recommend-popup"
import { useNativeShell } from "@/lib/native/use-native-shell"
import { usePushRegistration } from "@/lib/native/use-push-registration"

// Runs native shell setup (status bar, splash, back button) + push registration.
// No-ops on the web.
function NativeShell() {
  useNativeShell()
  usePushRegistration()
  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
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
      {children}
      <RecommendPopup />
    </QueryClientProvider>
  )
}
