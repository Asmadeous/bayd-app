"use client"

import { useState } from "react"
import { Lock } from "lucide-react"

import { useAuth } from "@/lib/hooks/use-auth"

// "Sign in with a passkey" — uses the email/phone the user has typed to look up
// their registered credentials, then runs the browser WebAuthn ceremony. Hidden
// until an identifier is entered. On success useAuth redirects to the dashboard.
export function PasskeySignIn({ email, phone }: { email?: string; phone?: string }) {
  const { passkeySignIn } = useAuth()
  const [error, setError] = useState<string | null>(null)

  const identifier = email?.trim() || phone?.trim()
  if (!identifier) return null

  async function run() {
    setError(null)
    try {
      await passkeySignIn.mutateAsync(email?.trim() ? { email: email.trim() } : { phone: phone!.trim() })
    } catch {
      // A cancelled prompt or no matching passkey lands here.
      setError("Couldn't sign in with a passkey. Try email or phone instead.")
    }
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={run}
        disabled={passkeySignIn.isPending}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-black/15 bg-white px-4 py-2.5 text-sm font-semibold text-[#101217] transition-colors hover:border-[#c96c83] disabled:opacity-60"
      >
        <Lock className="size-4" aria-hidden />
        {passkeySignIn.isPending ? "Waiting for your device…" : "Sign in with a passkey"}
      </button>
      {error && <p className="mt-2 text-sm font-medium text-[#8f3f4b]">{error}</p>}
    </div>
  )
}
