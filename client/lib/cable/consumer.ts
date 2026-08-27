"use client"

import { createConsumer, type Consumer } from "@rails/actioncable"

import { API_BASE_URL } from "@/lib/config"
import { useAuthStore } from "@/lib/stores/auth-store"

// The ActionCable URL is the API host with /cable (not /api/v1). Derive it from
// API_BASE_URL so it follows the same host in dev, prod, and the mobile build.
function cableUrl(token: string): string {
  const base = new URL(API_BASE_URL) // e.g. https://api.baydspa.ca/api/v1
  const proto = base.protocol === "https:" ? "wss:" : "ws:"
  // The Connection (2a) reads the JWT from ?token= on the handshake.
  return `${proto}//${base.host}/cable?token=${encodeURIComponent(token)}`
}

let consumer: Consumer | null = null
let consumerToken: string | null = null

// One shared consumer per auth token. Re-created if the token changes (re-login).
export function getConsumer(): Consumer | null {
  const token = useAuthStore.getState().token
  if (!token) return null

  if (consumer && consumerToken === token) return consumer

  consumer?.disconnect()
  consumer = createConsumer(cableUrl(token))
  consumerToken = token
  return consumer
}

export function disconnectConsumer(): void {
  consumer?.disconnect()
  consumer = null
  consumerToken = null
}
