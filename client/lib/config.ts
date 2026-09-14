export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1"

// The Jitsi Meet host the work-scope video calls run on. Mirrors the server's
// JITSI_HOST (see Meeting#url); default is the public meet.jit.si (no API key).
export const JITSI_HOST = process.env.NEXT_PUBLIC_JITSI_HOST ?? "meet.jit.si"
