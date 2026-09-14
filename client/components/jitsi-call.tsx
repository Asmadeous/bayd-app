"use client"

import { JitsiMeeting } from "@jitsi/react-sdk"

import { JITSI_HOST } from "@/lib/config"
import { useAuthStore } from "@/lib/stores/auth-store"

// Embedded work-scope video call. Renders the full Jitsi room INSIDE the app /
// page via the Jitsi IFrame external API (no browser hop, no leaving the app).
// Reused by both the mobile app and the website customer dashboard. The room is
// the Meeting's room_name; the host mirrors the server's JITSI_HOST.
export function JitsiCall({
  roomName,
  onEnd,
}: {
  roomName: string
  onEnd?: () => void
}) {
  const { user } = useAuthStore()
  const displayName =
    [user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.email || "Guest"

  return (
    <JitsiMeeting
      domain={JITSI_HOST}
      roomName={roomName}
      configOverwrite={{
        prejoinPageEnabled: false,
        startWithAudioMuted: false,
        disableModeratorIndicator: true,
      }}
      interfaceConfigOverwrite={{
        MOBILE_APP_PROMO: false,
        SHOW_JITSI_WATERMARK: false,
      }}
      userInfo={{ displayName, email: user?.email ?? "" }}
      // Leaving the call -> let the host surface navigate away (back to bookings).
      onReadyToClose={() => onEnd?.()}
      getIFrameRef={(node) => {
        node.style.height = "100%"
        node.style.width = "100%"
      }}
    />
  )
}
