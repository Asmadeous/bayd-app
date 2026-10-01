"use client"

import { Capacitor } from "@capacitor/core"

import api from "@/lib/api"

// Browser notifications for the website. The apps use their own push (FCM),
// so none of this runs inside them.
export function webPushSupported() {
  return (
    typeof window !== "undefined" &&
    !Capacitor.isNativePlatform() &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  )
}

function keyBytes(base64url: string) {
  const padded = base64url.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (base64url.length % 4)) % 4)
  const raw = atob(padded)
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

async function registration() {
  return navigator.serviceWorker.register("/sw.js")
}

// null when the server has no push key yet (the feature is off).
export async function webPushKey(): Promise<string | null> {
  try {
    const { data } = await api.get<{ public_key: string }>("/web_push/key")
    return data.public_key
  } catch {
    return null
  }
}

export async function currentSubscription() {
  const reg = await navigator.serviceWorker.getRegistration("/sw.js")
  return reg ? reg.pushManager.getSubscription() : null
}

export async function enableWebPush(publicKey: string) {
  const permission = await Notification.requestPermission()
  if (permission !== "granted") {
    throw new Error("Notifications are blocked for this site. Allow them in your browser's site settings, then try again.")
  }
  const reg = await registration()
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) }))
  const json = sub.toJSON()
  await api.post("/web_push/subscriptions", { subscription: { endpoint: json.endpoint, keys: json.keys } })
}

export async function disableWebPush() {
  const sub = await currentSubscription()
  if (!sub) return
  await api.delete("/web_push/subscriptions", { data: { endpoint: sub.endpoint } })
  await sub.unsubscribe()
}
