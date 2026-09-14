import { Capacitor } from "@capacitor/core"

// Thin haptic helpers. No-op on web (and if the plugin isn't present), fire on
// native. Loaded dynamically so the web bundle never pulls native code.
// - tap:     light selection feedback (nav taps, chips, list selects)
// - success: a confirming buzz (booking placed, code verified, item added)
// - warning/error: heavier notification feedback for failures

async function haptics() {
  if (!Capacitor.isNativePlatform()) return null
  try {
    return await import("@capacitor/haptics")
  } catch {
    return null
  }
}

export async function hapticTap() {
  const h = await haptics()
  if (!h) return
  try {
    await h.Haptics.impact({ style: h.ImpactStyle.Light })
  } catch {
    /* best-effort */
  }
}

export async function hapticSuccess() {
  const h = await haptics()
  if (!h) return
  try {
    await h.Haptics.notification({ type: h.NotificationType.Success })
  } catch {
    /* best-effort */
  }
}

export async function hapticError() {
  const h = await haptics()
  if (!h) return
  try {
    await h.Haptics.notification({ type: h.NotificationType.Error })
  } catch {
    /* best-effort */
  }
}
