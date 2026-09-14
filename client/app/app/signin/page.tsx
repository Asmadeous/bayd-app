"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { ArrowRight, ChevronLeft, Lock, Mail, Phone } from "lucide-react"

import { useAuth } from "@/lib/hooks/use-auth"
import { useToast } from "@/lib/app-ui/app-ui-provider"

const APP_REDIRECT = { afterAuth: "/app/home", afterLogout: "/app/welcome" }

// Dedicated SIGN-IN screen (separate from sign-up). Passwordless: an emailed or
// texted one-time code, or a passkey. A magic link would open the website, not
// the app, so we never use it here.
export default function SignInScreen() {
  const router = useRouter()
  const { requestEmailCode, requestPhoneCode, passkeySignIn } = useAuth(APP_REDIRECT)
  const { toast } = useToast()

  const [mode, setMode] = useState<"email" | "phone">("email")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")

  const contact = mode === "email" ? email.trim() : phone.trim()
  const sending = requestEmailCode.isPending || requestPhoneCode.isPending

  async function sendCode() {
    try {
      if (mode === "email") {
        await requestEmailCode.mutateAsync(email.trim())
        router.push(`/app/verify?channel=email&to=${encodeURIComponent(email.trim())}`)
      } else {
        await requestPhoneCode.mutateAsync(phone.trim())
        router.push(`/app/verify?channel=phone&to=${encodeURIComponent(phone.trim())}`)
      }
    } catch {
      toast({
        title: "Couldn't send the code",
        description: mode === "email" ? "Check the address and try again." : "Check the number and try again.",
        variant: "error",
      })
    }
  }

  async function signInWithPasskey() {
    if (!contact) {
      toast({ title: "Enter your email or phone first", description: "Then use your passkey.", variant: "warning" })
      return
    }
    try {
      await passkeySignIn.mutateAsync(mode === "email" ? { email: contact } : { phone: contact })
    } catch {
      toast({
        title: "Couldn't sign in with a passkey",
        description: "Use the email or phone option.",
        variant: "error",
      })
    }
  }

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-[#14100F] px-6 pb-[calc(2.5rem+env(safe-area-inset-bottom))] pt-[calc(3.5rem+env(safe-area-inset-top))] text-[#F6F1EC]">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 right-[-20%] size-72 rounded-full bg-[#C96C83]/25 blur-3xl"
      />

      <div className="relative mx-auto flex w-full max-w-sm flex-1 flex-col">
        <Link href="/app/welcome" className="mb-6 inline-flex items-center gap-1 text-sm font-semibold text-white/55">
          <ChevronLeft className="size-4" aria-hidden /> Back
        </Link>

        <div className="relative mx-auto h-11 w-32">
          <Image alt="Beauty @ Your Door" className="object-contain" fill priority src="/images/brand/bayd-logo-white.png" unoptimized />
        </div>

        <div className="mt-10">
          <h1 className="text-[2.2rem] font-black leading-[1.05] tracking-tight">Welcome back</h1>
          <p className="mt-3 text-[0.95rem] leading-relaxed text-white/55">
            Sign in to book, shop, and manage your appointments.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-1 rounded-2xl bg-white/6 p-1">
          {(["email", "phone"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold transition-colors ${
                mode === m ? "bg-[#C96C83] text-white" : "text-white/55"
              }`}
            >
              {m === "email" ? <Mail className="size-4" /> : <Phone className="size-4" />}
              {m === "email" ? "Email" : "Phone"}
            </button>
          ))}
        </div>

        <div className="mt-5 space-y-3">
          {mode === "email" ? (
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && contact && sendCode()}
              className="w-full rounded-2xl border border-white/12 bg-white/6 px-4 py-3.5 text-base text-white placeholder:text-white/35 focus:border-[#C96C83] focus:outline-none"
            />
          ) : (
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+1 555 123 4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && contact && sendCode()}
              className="w-full rounded-2xl border border-white/12 bg-white/6 px-4 py-3.5 text-base text-white placeholder:text-white/35 focus:border-[#C96C83] focus:outline-none"
            />
          )}

          <button
            type="button"
            onClick={sendCode}
            disabled={!contact || sending}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#C96C83] px-4 py-3.5 text-base font-bold text-white transition-opacity disabled:opacity-40"
          >
            {sending ? "Sending…" : "Continue"}
            {!sending && <ArrowRight className="size-[1.15rem]" aria-hidden />}
          </button>

          <div className="flex items-center gap-3 py-1">
            <span className="h-px flex-1 bg-white/10" />
            <span className="text-xs font-medium uppercase tracking-[0.14em] text-white/35">or</span>
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <button
            type="button"
            onClick={signInWithPasskey}
            disabled={passkeySignIn.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-transparent px-4 py-3.5 text-base font-semibold text-white transition-colors hover:border-[#C96C83] disabled:opacity-50"
          >
            <Lock className="size-[1.15rem]" aria-hidden />
            {passkeySignIn.isPending ? "Waiting for your device…" : "Use a passkey"}
          </button>
        </div>

        <p className="mt-auto pt-8 text-center text-xs text-white/45">
          New here?{" "}
          <Link href="/app/signup" className="font-bold text-[#C96C83]">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  )
}
