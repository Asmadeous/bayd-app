"use client"

import { useState } from "react"

import api from "@/lib/api"

// Self-contained change-password form for logged-in staff/admin. Deliberately
// toast-agnostic (it renders its own inline status) because the staff app and
// the admin dashboard use different toast providers - keeping messaging inline
// lets one component serve both. Calls POST /auth/change_password, which verifies
// the current password server-side; the session stays valid on success.
export function ChangePasswordForm({
  className = "",
  onSuccess,
}: {
  className?: string
  onSuccess?: () => void
}) {
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)

    if (next.length < 8) {
      setMsg({ type: "error", text: "New password must be at least 8 characters." })
      return
    }
    if (next !== confirm) {
      setMsg({ type: "error", text: "The new passwords don't match." })
      return
    }

    setBusy(true)
    try {
      await api.post("/auth/change_password", { current_password: current, new_password: next })
      setMsg({ type: "success", text: "Password updated." })
      setCurrent("")
      setNext("")
      setConfirm("")
      onSuccess?.()
    } catch (error: unknown) {
      const data = (error as { response?: { data?: { error?: string } } })?.response?.data
      setMsg({ type: "error", text: data?.error ?? "Could not update the password." })
    } finally {
      setBusy(false)
    }
  }

  const inputClass =
    "h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-base text-[#14100F] outline-none focus:border-[#C96C83]"

  return (
    <form onSubmit={submit} className={`space-y-3 ${className}`}>
      <input
        type="password"
        autoComplete="current-password"
        placeholder="Current password"
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
        required
        className={inputClass}
      />
      <input
        type="password"
        autoComplete="new-password"
        placeholder="New password (min 8 characters)"
        value={next}
        onChange={(e) => setNext(e.target.value)}
        required
        className={inputClass}
      />
      <input
        type="password"
        autoComplete="new-password"
        placeholder="Confirm new password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        required
        className={inputClass}
      />

      {msg && (
        <p className={`text-sm font-medium ${msg.type === "success" ? "text-[#3f7e47]" : "text-[#b3453f]"}`}>
          {msg.text}
        </p>
      )}

      <button
        type="submit"
        disabled={busy || !current || !next || !confirm}
        className="h-11 w-full rounded-xl bg-[#14100F] text-sm font-bold text-white disabled:opacity-40"
      >
        {busy ? "Updating…" : "Change password"}
      </button>
    </form>
  )
}
