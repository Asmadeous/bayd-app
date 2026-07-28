"use client"

import { useEffect, useRef } from "react"
import { useAuthStore } from "@/lib/stores/auth-store"

declare global {
  interface Window {
    Tawk_API: {
      onLoad?: () => void
      setAttributes?: (
        attrs: Record<string, string>,
        callback?: (error?: unknown) => void,
      ) => void
    }
    Tawk_LoadStart: Date
  }
}

export function TawkToChat() {
  const { user } = useAuthStore()
  const scriptLoaded = useRef(false)

  useEffect(() => {
    const propertyId = process.env.NEXT_PUBLIC_TAWK_PROPERTY_ID
    const widgetId = process.env.NEXT_PUBLIC_TAWK_WIDGET_ID
    if (!propertyId || !widgetId || scriptLoaded.current) return

    scriptLoaded.current = true
    window.Tawk_API = window.Tawk_API || {}
    window.Tawk_LoadStart = new Date()

    const script = document.createElement("script")
    script.async = true
    script.src = `https://embed.tawk.to/${propertyId}/${widgetId}`
    script.charset = "UTF-8"
    script.setAttribute("crossorigin", "*")

    const first = document.getElementsByTagName("script")[0]
    first?.parentNode?.insertBefore(script, first)
  }, [])

  // Identify the logged-in user to Tawk.to so agents can see who they are chatting with
  useEffect(() => {
    if (!user) return

    const attrs: Record<string, string> = {
      name:
        [user.first_name, user.last_name].filter(Boolean).join(" ") ||
        user.email,
      email: user.email,
    }

    if (window.Tawk_API?.setAttributes) {
      window.Tawk_API.setAttributes(attrs, () => {})
    } else {
      window.Tawk_API = window.Tawk_API || {}
      const prevOnLoad = window.Tawk_API.onLoad
      window.Tawk_API.onLoad = function () {
        prevOnLoad?.()
        window.Tawk_API.setAttributes?.(attrs, () => {})
      }
    }
  }, [user])

  return null
}
