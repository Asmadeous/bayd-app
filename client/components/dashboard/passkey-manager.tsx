"use client"

import { useState } from "react"
import { Lock } from "lucide-react"

import { DashboardPanel } from "@/components/dashboard/dashboard-panel"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/hooks/use-auth"

// Lets a logged-in user add a passkey (Face ID / fingerprint / security key) for
// faster, stronger sign-in next time. Runs the browser WebAuthn registration
// ceremony against the 5d backend. Not shown where WebAuthn is unavailable.
export function PasskeyManager() {
  const { registerPasskey } = useAuth()
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supported = typeof window !== "undefined" && !!window.PublicKeyCredential

  async function add() {
    setError(null)
    try {
      await registerPasskey.mutateAsync(undefined)
      setDone(true)
    } catch {
      setError("Couldn't add a passkey. Your device may not support it, or the prompt was dismissed.")
    }
  }

  if (!supported) return null

  return (
    <DashboardPanel className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center border border-black/10 bg-[#f4f1eb] text-[#c96c83]">
          <Lock aria-hidden className="size-5" />
        </span>
        <div>
          <p className="text-sm font-extrabold text-[#101217]">Passkey</p>
          <p className="mt-1 text-xs font-semibold text-[#5f6268]">Sign in with Face ID, fingerprint, or a security key.</p>
        </div>
      </div>
      {done ? (
        <p className="rounded-lg border border-[#5a9e5a]/25 bg-[#5a9e5a]/10 px-3 py-2 text-sm font-semibold text-[#3f7a3f]">
          Passkey added — you can use it to sign in next time.
        </p>
      ) : (
        <Button type="button" onClick={add} disabled={registerPasskey.isPending} className="w-full">
          {registerPasskey.isPending ? "Waiting for your device…" : "Add a passkey"}
        </Button>
      )}
      {error && <p className="text-sm font-medium text-[#8f3f4b]">{error}</p>}
    </DashboardPanel>
  )
}
