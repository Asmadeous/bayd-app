"use client"

import { useEffect, useState } from "react"
import { BellRing } from "lucide-react"

import { useToast } from "@/components/bayd-toast-provider"
import { DashboardPanel } from "@/components/dashboard/dashboard-panel"
import { Button } from "@/components/ui/button"
import api from "@/lib/api"
import { currentSubscription, disableWebPush, enableWebPush, webPushKey, webPushSupported } from "@/lib/web-push"

type State = "loading" | "hidden" | "off" | "on" | "blocked"

// "Get notifications in this browser" on the dashboard's Notifications page.
// Hidden inside the apps (they have their own push), in browsers without push,
// and until the server has a push key.
export function WebPushToggle() {
  const { toast } = useToast()
  const [state, setState] = useState<State>("loading")
  const [publicKey, setPublicKey] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!webPushSupported()) return setState("hidden")
      const key = await webPushKey()
      if (cancelled) return
      if (!key) return setState("hidden")
      setPublicKey(key)
      if (Notification.permission === "denied") return setState("blocked")
      setState((await currentSubscription()) ? "on" : "off")
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (state === "loading" || state === "hidden") return null

  async function turnOn() {
    if (!publicKey) return
    setBusy(true)
    try {
      await enableWebPush(publicKey)
      setState("on")
      toast({ title: "Browser notifications on", variant: "success" })
    } catch (e) {
      setState(Notification.permission === "denied" ? "blocked" : "off")
      toast({ title: "Couldn't turn them on", description: e instanceof Error ? e.message : "Please try again.", variant: "error" })
    } finally {
      setBusy(false)
    }
  }

  async function turnOff() {
    setBusy(true)
    try {
      await disableWebPush()
      setState("off")
      toast({ title: "Browser notifications off", variant: "success" })
    } finally {
      setBusy(false)
    }
  }

  async function test() {
    try {
      await api.post("/web_push/test")
      toast({ title: "Test sent", description: "It should pop up in a few seconds.", variant: "success" })
    } catch {
      toast({ title: "Test not sent", variant: "error" })
    }
  }

  return (
    <DashboardPanel className="flex flex-wrap items-center gap-4">
      <span className="grid size-10 shrink-0 place-items-center bg-[#c96c83]/12 text-[#c96c83]">
        <BellRing aria-hidden className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-extrabold text-[#101217]">
          {state === "on" ? "Browser notifications are on" : "Get notifications in this browser"}
        </p>
        <p className="text-xs text-[#5f6268]">
          {state === "blocked"
            ? "Notifications are blocked for this site. Allow them in your browser's site settings to turn this on."
            : "Booking updates, messages and reminders pop up even when this tab is closed."}
        </p>
      </div>
      {state === "on" ? (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={test}>
            Send a test
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={turnOff}>
            Turn off
          </Button>
        </div>
      ) : state === "off" ? (
        <Button size="sm" disabled={busy} onClick={turnOn}>
          Turn on
        </Button>
      ) : null}
    </DashboardPanel>
  )
}
