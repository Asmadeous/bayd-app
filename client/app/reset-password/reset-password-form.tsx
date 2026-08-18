"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"

import { buttonVariants } from "@/components/ui/button"
import { PasswordInput } from "@/components/ui/password-input"
import { useAuth } from "@/lib/hooks/use-auth"
import { cn } from "@/lib/utils"

const field =
  "mt-2 h-13 w-full border border-black/15 bg-white px-4 text-base font-semibold text-[#101217] outline-none transition-colors placeholder:text-[#8a8d93] focus:border-[#c96c83] focus:ring-3 focus:ring-[#c96c83]/20"

export function ResetPasswordForm() {
  const router = useRouter()
  const params = useSearchParams()
  const token = params.get("token")
  const { resetPassword } = useAuth()
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (!token) {
      setError("This reset link is missing its token. Please request a new one.")
      return
    }

    try {
      await resetPassword.mutateAsync({ token, password })
      setDone(true)
      setTimeout(() => router.push("/signin"), 2000)
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string; errors?: string[] } } })?.response?.data?.error ??
        (err as { response?: { data?: { errors?: string[] } } })?.response?.data?.errors?.join(", ") ??
        "Something went wrong. Please try again."
      setError(msg)
    }
  }

  if (!token) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        This reset link is invalid or missing its token.{" "}
        <Link className="font-bold underline" href="/forgot-password">
          Request a new one
        </Link>
        .
      </p>
    )
  }

  if (done) {
    return (
      <p className="rounded-lg border border-[#5a9e5a]/25 bg-[#5a9e5a]/10 px-4 py-3 text-sm font-semibold text-[#3f7a3f]">
        Password updated. Taking you to sign in…
      </p>
    )
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <label className="block">
        <span className="text-sm font-extrabold text-[#101217]">New password</span>
        <PasswordInput
          autoComplete="new-password"
          className={field}
          minLength={8}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          required
          value={password}
        />
      </label>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        className={cn(buttonVariants(), "h-13 w-full px-6 text-base font-bold disabled:opacity-60")}
        disabled={resetPassword.isPending}
        type="submit"
      >
        {resetPassword.isPending ? "Please wait…" : "Set new password"}
      </button>
    </form>
  )
}
