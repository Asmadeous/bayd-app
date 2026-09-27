"use client"

import { Capacitor } from "@capacitor/core"

import { siteConfig } from "@/lib/site"
import { cn } from "@/lib/utils"

// The phone apps don't bundle the website's pages, so the legal pages open from
// the live site: in the in-app browser on native, a new tab on the web.
export async function openLegal(path: "/privacy" | "/terms") {
  const url = `${siteConfig.url}${path}`
  if (Capacitor.isNativePlatform()) {
    const mod = await import("@capacitor/browser").catch(() => null)
    if (mod?.Browser) return mod.Browser.open({ url })
  }
  window.open(url, "_blank", "noopener,noreferrer")
}

export function LegalLinks({ className, linkClassName }: { className?: string; linkClassName?: string }) {
  const link = cn("font-semibold underline underline-offset-2", linkClassName)
  return (
    <p className={cn("text-center text-sm", className)}>
      <button type="button" onClick={() => void openLegal("/privacy")} className={link}>
        Privacy Policy
      </button>
      <span aria-hidden> · </span>
      <button type="button" onClick={() => void openLegal("/terms")} className={link}>
        Terms of Service
      </button>
    </p>
  )
}

// Shown under a sign-up button: what the user agrees to by continuing.
export function SignupConsent({ className, linkClassName }: { className?: string; linkClassName?: string }) {
  const link = cn("font-semibold underline underline-offset-2", linkClassName)
  return (
    <p className={cn("text-center text-sm", className)}>
      By continuing you agree to our{" "}
      <button type="button" onClick={() => void openLegal("/terms")} className={link}>
        Terms of Service
      </button>{" "}
      and{" "}
      <button type="button" onClick={() => void openLegal("/privacy")} className={link}>
        Privacy Policy
      </button>
      .
    </p>
  )
}
