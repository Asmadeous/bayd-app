"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft } from "lucide-react"

import { useAuth } from "@/lib/hooks/use-auth"
import { useToast } from "@/lib/app-ui/app-ui-provider"

const APP_REDIRECT = { afterAuth: "/app/home", afterLogout: "/app/welcome" }
const CODE_LEN = 6

// Dedicated full-screen OTP entry - its own page, reached after the welcome
// screen sends a code. Six single-digit boxes, resend, back. Purpose-built for
// the app (no website chrome). Channel + destination come from the query string.
export default function VerifyScreen() {
  return (
    <Suspense>
      <Verify />
    </Suspense>
  )
}

function Verify() {
  const router = useRouter()
  const params = useSearchParams()
  const channel = params.get("channel") === "phone" ? "phone" : "email"
  const to = params.get("to") ?? ""
  // On signup we carry the name + email so the verified-phone account is created
  // with all three (see welcome screen). Absent on a plain sign-in.
  const signupEmail = params.get("signup") ? params.get("email") ?? undefined : undefined
  const signupFirstName = params.get("signup") ? params.get("first_name") ?? undefined : undefined

  const { verifyEmailCode, verifyPhoneCode, requestEmailCode, requestPhoneCode } = useAuth(APP_REDIRECT)
  const { toast } = useToast()

  const [digits, setDigits] = useState<string[]>(Array(CODE_LEN).fill(""))
  // `hasError` only drives the box border color; the message is a toast.
  const [hasError, setHasError] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const inputs = useRef<(HTMLInputElement | null)[]>([])

  const code = digits.join("")
  const complete = code.length === CODE_LEN

  // No destination -> nothing to verify; send them back to sign in.
  useEffect(() => {
    if (!to) router.replace("/app/welcome")
  }, [to, router])

  // Focus the first box on mount.
  useEffect(() => {
    inputs.current[0]?.focus()
  }, [])

  // Resend cooldown tick.
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  function setDigit(i: number, v: string) {
    const clean = v.replace(/\D/g, "")
    setHasError(false)
    if (clean.length > 1) {
      // Handle a pasted code across the boxes.
      const next = digits.slice()
      for (let k = 0; k < CODE_LEN; k++) next[k] = clean[k] ?? ""
      setDigits(next)
      inputs.current[Math.min(clean.length, CODE_LEN - 1)]?.focus()
      if (next.join("").length === CODE_LEN) submit(next.join(""))
      return
    }
    const next = digits.slice()
    next[i] = clean
    setDigits(next)
    if (clean && i < CODE_LEN - 1) {
      inputs.current[i + 1]?.focus()
    } else if (clean && i === CODE_LEN - 1) {
      // Last box filled -> auto-submit the completed code.
      const full = next.join("")
      if (full.length === CODE_LEN) submit(full)
    }
  }

  function onKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i] && i > 0) inputs.current[i - 1]?.focus()
  }

  async function submit(value = code) {
    if (value.length !== CODE_LEN) return
    setHasError(false)
    try {
      if (channel === "email") await verifyEmailCode.mutateAsync({ email: to, code: value })
      else await verifyPhoneCode.mutateAsync({ phone: to, code: value, email: signupEmail, first_name: signupFirstName })
      // useAuth redirects to /app/home on success.
    } catch {
      setHasError(true)
      toast({ title: "That code didn't work", description: "Check it or request a new one.", variant: "error" })
      setDigits(Array(CODE_LEN).fill(""))
      inputs.current[0]?.focus()
    }
  }

  async function resend() {
    if (cooldown > 0) return
    setHasError(false)
    try {
      if (channel === "email") await requestEmailCode.mutateAsync(to)
      else await requestPhoneCode.mutateAsync(to)
      setCooldown(30)
      toast({ title: "A fresh code is on its way", variant: "success" })
    } catch {
      toast({ title: "Couldn't resend the code", description: "Try again in a moment.", variant: "error" })
    }
  }

  const verifying = verifyEmailCode.isPending || verifyPhoneCode.isPending

  return (
    <div className="flex min-h-dvh flex-col bg-[#14100F] px-6 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))] text-[#F6F1EC]">
      <button
        type="button"
        onClick={() => router.replace("/app/welcome")}
        aria-label="Back"
        className="grid size-10 place-items-center rounded-full bg-white/8 text-white"
      >
        <ChevronLeft className="size-5" aria-hidden />
      </button>

      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
        <p className="text-[0.7rem] font-bold uppercase tracking-[0.2em] text-[#C96C83]">
          Verify it&apos;s you
        </p>
        <h1 className="mt-2 text-[2rem] font-black leading-[1.1] tracking-tight">
          Enter your code
        </h1>
        <p className="mt-2 text-sm text-white/55">
          We sent a {CODE_LEN}-digit code to{" "}
          <span className="font-semibold text-white/80">{to}</span>.
        </p>

        <div className="mt-8 flex justify-between gap-2">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                inputs.current[i] = el
              }}
              type="text"
              inputMode="numeric"
              autoComplete={i === 0 ? "one-time-code" : "off"}
              maxLength={CODE_LEN}
              value={d}
              onChange={(e) => setDigit(i, e.target.value)}
              onKeyDown={(e) => onKeyDown(i, e)}
              className={`h-14 w-full min-w-0 rounded-2xl border bg-white/6 text-center text-2xl font-black text-white outline-none transition-colors ${
                hasError ? "border-[#f2a3af]" : d ? "border-[#C96C83]" : "border-white/12 focus:border-[#C96C83]"
              }`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => submit()}
          disabled={!complete || verifying}
          className="mt-8 w-full rounded-xl bg-[#C96C83] px-4 py-3.5 text-base font-bold text-white transition-opacity disabled:opacity-40"
        >
          {verifying ? "Verifying…" : "Verify & continue"}
        </button>

        <div className="mt-5 text-center text-sm text-white/50">
          Didn&apos;t get it?{" "}
          <button
            type="button"
            onClick={resend}
            disabled={cooldown > 0}
            className="font-bold text-[#C96C83] disabled:text-white/30"
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
          </button>
        </div>
      </div>
    </div>
  )
}
