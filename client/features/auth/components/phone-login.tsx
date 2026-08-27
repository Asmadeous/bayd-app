"use client"

import { useState, type FormEvent } from "react"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/hooks/use-auth"

// Customer phone-number + OTP login. Step 1: enter phone -> code texted (Infobip).
// Step 2: enter the 6-digit code -> logged in. Sits alongside the email sign-in.
export function PhoneLogin() {
  const { requestPhoneCode, verifyPhoneCode } = useAuth()
  const [phone, setPhone] = useState("")
  const [code, setCode] = useState("")
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function sendCode(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await requestPhoneCode.mutateAsync(phone.trim())
      setSent(true)
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status
      setError(status === 429 ? "Please wait a moment before requesting another code." : "Couldn't send a code. Check the number and try again.")
    }
  }

  async function verify(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await verifyPhoneCode.mutateAsync({ phone: phone.trim(), code: code.trim() })
      // success -> useAuth redirects to the dashboard
    } catch {
      setError("That code is invalid or has expired.")
    }
  }

  const inputCls =
    "w-full rounded-lg border border-black/15 px-4 py-2.5 text-sm outline-none focus:border-[#c96c83]"

  return (
    <form onSubmit={sent ? verify : sendCode} className="space-y-3">
      {!sent ? (
        <>
          <label className="block text-sm font-semibold text-[#101217]">Phone number</label>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+1 416 555 0100"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputCls}
            required
          />
          <Button type="submit" className="w-full" disabled={requestPhoneCode.isPending || !phone.trim()}>
            {requestPhoneCode.isPending ? "Sending…" : "Text me a code"}
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm text-[#5f6268]">
            We texted a code to <span className="font-semibold text-[#101217]">{phone}</span>.
          </p>
          <label className="block text-sm font-semibold text-[#101217]">Verification code</label>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className={`${inputCls} tracking-[0.4em]`}
            required
          />
          <Button type="submit" className="w-full" disabled={verifyPhoneCode.isPending || code.length < 6}>
            {verifyPhoneCode.isPending ? "Verifying…" : "Verify & sign in"}
          </Button>
          <button
            type="button"
            onClick={() => { setSent(false); setCode(""); setError(null) }}
            className="text-xs font-medium text-[#8a8d93] hover:underline"
          >
            Use a different number
          </button>
        </>
      )}
      {error && <p className="text-sm font-medium text-[#8f3f4b]">{error}</p>}
    </form>
  )
}
