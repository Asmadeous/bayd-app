import { Capacitor } from "@capacitor/core"

// Native device biometrics (Face ID / fingerprint / device PIN) via
// capacitor-native-biometric. Unlike WebAuthn passkeys, this works in the
// Capacitor WebView with no domain / assetlinks setup - it's a local device
// check. Used for an optional "unlock the app" gate, not server auth.
//
// The enabled flag lives in localStorage (bayd-biometric-lock). The app layout
// can read it to require an unlock on launch.

const LOCK_KEY = "bayd-biometric-lock"

export async function biometricAvailable(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false
  try {
    const { NativeBiometric } = await import("capacitor-native-biometric")
    const result = await NativeBiometric.isAvailable()
    return result.isAvailable
  } catch {
    return false
  }
}

// Prompt the device biometric. Resolves true if the user passed, false otherwise.
export async function verifyBiometric(reason = "Confirm it's you"): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false
  try {
    const { NativeBiometric } = await import("capacitor-native-biometric")
    await NativeBiometric.verifyIdentity({
      reason,
      title: "Beauty @ Your Door",
      subtitle: reason,
    })
    return true
  } catch {
    // A cancelled / failed prompt rejects.
    return false
  }
}

export function biometricLockEnabled(): boolean {
  if (typeof window === "undefined") return false
  return window.localStorage.getItem(LOCK_KEY) === "1"
}

export function setBiometricLock(on: boolean) {
  if (typeof window === "undefined") return
  if (on) window.localStorage.setItem(LOCK_KEY, "1")
  else window.localStorage.removeItem(LOCK_KEY)
}
