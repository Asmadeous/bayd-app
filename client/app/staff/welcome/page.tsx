"use client"

import Image from "next/image"
import { useState } from "react"
import { Eye, EyeOff, Lock } from "lucide-react"

import { useAuth } from "@/lib/hooks/use-auth"
import { useToast } from "@/lib/app-ui/app-ui-provider"

const STAFF_REDIRECT = { afterAuth: "/staff/schedule", afterLogout: "/staff/welcome" }

// Staff/admin sign-in: email + password on /auth/staff_login. Purpose-built for
// the staff app - single column, dark, no website chrome.
export default function StaffWelcomeScreen() {
  const { staffLogin } = useAuth(STAFF_REDIRECT)
  const { toast } = useToast()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [show, setShow] = useState(false)

  async function signIn() {
    try {
      await staffLogin.mutateAsync({ email: email.trim(), password })
      // useAuth redirects to /staff/schedule on success.
    } catch {
      toast({ title: "Wrong email or password", description: "Please try again.", variant: "error" })
    }
  }

  const canSubmit = email.trim().length > 0 && password.length > 0

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-[#14100F] px-6 pb-[calc(2.5rem+env(safe-area-inset-bottom))] pt-[calc(3.5rem+env(safe-area-inset-top))] text-[#F4F2EF]">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 right-[-20%] size-72 rounded-full bg-[#C96C83]/20 blur-3xl"
      />

      <div className="relative mx-auto flex w-full max-w-sm flex-1 flex-col">
        <div className="relative mx-auto h-12 w-36">
          <Image
            alt="Beauty @ Your Door"
            className="object-contain"
            fill
            priority
            src="/images/brand/bayd-logo-white.png"
            unoptimized
          />
        </div>

        <div className="mt-12">
          <p className="text-[0.7rem] font-bold uppercase tracking-[0.2em] text-[#C96C83]">Staff</p>
          <h1 className="mt-2 text-[2.2rem] font-black leading-[1.05] tracking-tight">
            Sign in to your day.
          </h1>
          <p className="mt-3 text-[0.95rem] leading-relaxed text-white/55">
            Jobs, shifts, clock-in, and earnings - all in one place.
          </p>
        </div>

        <div className="mt-9 space-y-3">
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@baydspa.ca"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-2xl border border-white/12 bg-white/6 px-4 py-3.5 text-base text-white placeholder:text-white/35 focus:border-[#C96C83] focus:outline-none"
          />
          <div className="relative">
            <input
              type={show ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && canSubmit && signIn()}
              className="w-full rounded-2xl border border-white/12 bg-white/6 px-4 py-3.5 pr-12 text-base text-white placeholder:text-white/35 focus:border-[#C96C83] focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/45"
            >
              {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
            </button>
          </div>

          <button
            type="button"
            onClick={signIn}
            disabled={!canSubmit || staffLogin.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#C96C83] px-4 py-3.5 text-base font-bold text-white transition-opacity disabled:opacity-40"
          >
            <Lock className="size-[1.1rem]" aria-hidden />
            {staffLogin.isPending ? "Signing in…" : "Sign in"}
          </button>
        </div>


        <p className="mt-auto pt-8 text-center text-xs text-white/35">
          Staff accounts are created by an admin. Contact your manager if you can&apos;t sign in.
        </p>
      </div>
    </div>
  )
}
