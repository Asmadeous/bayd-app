"use client"

import { useEffect, useState } from "react"

import { useToast } from "@/lib/app-ui/app-ui-provider"
import { biometricAvailable, biometricLockEnabled, setBiometricLock, verifyBiometric } from "@/lib/native/biometric"
import { hapticError, hapticSuccess } from "@/lib/native/haptics"

// The biometric app-lock switch on both Profile screens. Turning it on requires
// passing the device biometric once (proving it works); turning it off just
// clears the flag.
export function useAppLock() {
  const { toast } = useToast()
  const [available, setAvailable] = useState(false)
  const [on, setOn] = useState(() => biometricLockEnabled())
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    biometricAvailable().then(setAvailable)
  }, [])

  async function toggle() {
    setBusy(true)
    try {
      if (on) {
        setBiometricLock(false)
        setOn(false)
        toast({ title: "App lock turned off", variant: "warning" })
        return
      }
      if (await verifyBiometric("Enable app lock")) {
        setBiometricLock(true)
        setOn(true)
        hapticSuccess()
        toast({ title: "App lock on", description: "You'll unlock with your fingerprint or face.", variant: "success" })
      } else {
        hapticError()
        toast({ title: "Couldn't verify", description: "App lock not enabled.", variant: "error" })
      }
    } finally {
      setBusy(false)
    }
  }

  return { available, on, busy, toggle }
}
