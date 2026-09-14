"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { ArrowRight, ChevronLeft } from "lucide-react"

import { useAuth } from "@/lib/hooks/use-auth"
import { useToast } from "@/lib/app-ui/app-ui-provider"

const APP_REDIRECT = { afterAuth: "/app/home", afterLogout: "/app/welcome" }

// Dedicated SIGN-UP screen (separate from sign-in). Phone is REQUIRED and gets
// verified by OTP: we text a code, and the verify screen confirms it and creates
// the account carrying the name + email through, so every new account has a
// verified phone.
export default function SignUpScreen() {
  const router = useRouter()
  const { requestPhoneCode } = useAuth(APP_REDIRECT)
  const { toast } = useToast()

  const [firstName, setFirstName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")

  const ready = firstName.trim() !== "" && email.trim() !== "" && phone.trim() !== ""
  const sending = requestPhoneCode.isPending

  async function startSignup() {
    if (!ready) return
    try {
      await requestPhoneCode.mutateAsync(phone.trim())
      const q = new URLSearchParams({
        channel: "phone",
        to: phone.trim(),
        signup: "1",
        email: email.trim(),
        first_name: firstName.trim(),
      })
      router.push(`/app/verify?${q.toString()}`)
    } catch {
      toast({ title: "Couldn't send the code", description: "Check the number and try again.", variant: "error" })
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
          <h1 className="text-[2.2rem] font-black leading-[1.05] tracking-tight">Create your account</h1>
          <p className="mt-3 text-[0.95rem] leading-relaxed text-white/55">
            We&apos;ll text a code to verify your number, then you&apos;re ready to book.
          </p>
        </div>

        <div className="mt-8 space-y-3">
          <input
            type="text"
            autoComplete="given-name"
            placeholder="First name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full rounded-2xl border border-white/12 bg-white/6 px-4 py-3.5 text-base text-white placeholder:text-white/35 focus:border-[#C96C83] focus:outline-none"
          />
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-2xl border border-white/12 bg-white/6 px-4 py-3.5 text-base text-white placeholder:text-white/35 focus:border-[#C96C83] focus:outline-none"
          />
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="Phone (+1 555 123 4567)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ready && startSignup()}
            className="w-full rounded-2xl border border-white/12 bg-white/6 px-4 py-3.5 text-base text-white placeholder:text-white/35 focus:border-[#C96C83] focus:outline-none"
          />

          <button
            type="button"
            onClick={startSignup}
            disabled={!ready || sending}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#C96C83] px-4 py-3.5 text-base font-bold text-white transition-opacity disabled:opacity-40"
          >
            {sending ? "Sending…" : "Verify my number"}
            {!sending && <ArrowRight className="size-[1.15rem]" aria-hidden />}
          </button>
        </div>

        <p className="mt-auto pt-8 text-center text-xs text-white/45">
          Already have an account?{" "}
          <Link href="/app/signin" className="font-bold text-[#C96C83]">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
