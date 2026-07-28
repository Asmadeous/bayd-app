"use client"

import { useEffect, useRef } from "react"
import { useAuth } from "@/lib/hooks/use-auth"

/* Minimal typings for Google Identity Services. */
interface GoogleAccountsId {
  initialize: (config: { client_id: string; callback: (res: { credential: string }) => void }) => void
  renderButton: (el: HTMLElement, options: Record<string, unknown>) => void
}
declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } }
  }
}

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? ""
const GSI_SRC = "https://accounts.google.com/gsi/client"

function loadGsi(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve()
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SRC}"]`)
    if (existing) {
      existing.addEventListener("load", () => resolve())
      existing.addEventListener("error", () => reject(new Error("Failed to load Google SDK")))
      return
    }
    const script = document.createElement("script")
    script.src = GSI_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("Failed to load Google SDK"))
    document.head.appendChild(script)
  })
}

export function GoogleSignIn() {
  const { loginWithGoogle } = useAuth()
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!CLIENT_ID || !containerRef.current) return
    let cancelled = false

    loadGsi()
      .then(() => {
        if (cancelled || !window.google || !containerRef.current) return
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (res) => loginWithGoogle.mutate(res.credential),
        })
        window.google.accounts.id.renderButton(containerRef.current, {
          theme: "outline",
          size: "large",
          width: 360,
          text: "continue_with",
          shape: "rectangular",
        })
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [loginWithGoogle])

  // Hide entirely if Google isn't configured.
  if (!CLIENT_ID) return null

  return (
    <div className="mt-6">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-black/10" />
        <span className="text-xs font-semibold uppercase tracking-wide text-[#8a8d93]">or</span>
        <span className="h-px flex-1 bg-black/10" />
      </div>
      <div className="mt-5 flex justify-center">
        <div ref={containerRef} />
      </div>
      {loginWithGoogle.isError && (
        <p className="mt-3 text-center text-sm text-red-700">
          Google sign-in failed. Please try again.
        </p>
      )}
    </div>
  )
}
