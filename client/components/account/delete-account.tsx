"use client"

import { useState } from "react"
import { Trash2, X } from "lucide-react"

import { formatBookingDate, formatBookingTime } from "@/lib/booking-time"
import { useDeleteAccount, useDeletionPreview } from "@/lib/hooks/use-account"

const CONFIRM_WORD = "DELETE"

function apiError(e: unknown) {
  const d = e as { response?: { data?: { error?: string } }; message?: string }
  return d?.response?.data?.error ?? d?.message ?? "Please try again."
}

// The store-required "delete my account" entry point plus its guided sheet: what
// is erased, what is kept and why, which upcoming bookings get cancelled (or why
// deletion is blocked), then a typed confirmation. onDeleted signs the user out.
export function DeleteAccountButton({
  onDeleted,
  className,
  audience = "customer",
}: {
  onDeleted: () => void
  className?: string
  audience?: Audience
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ??
          "flex w-full items-center justify-center gap-2 rounded-2xl bg-[#D32F2F] py-3.5 text-sm font-bold text-white shadow-sm active:bg-[#B71C1C]"
        }
      >
        <Trash2 className="size-4" aria-hidden />
        Delete account
      </button>
      {open ? <DeleteAccountSheet audience={audience} onClose={() => setOpen(false)} onDeleted={onDeleted} /> : null}
    </>
  )
}

type Audience = "customer" | "staff"

// What each kind of account keeps after deletion, in the words its user knows.
const KEPT: Record<Audience, { erased: string; kept: string }> = {
  customer: {
    erased: "your messages, notifications and loyalty points",
    kept: "Past bookings, payments and invoices, because the law requires us to keep tax records.",
  },
  staff: {
    erased: "your messages, notifications and sign-in",
    kept: "Past jobs, shifts and earnings, because they're payroll and tax records.",
  },
}

function DeleteAccountSheet({
  audience,
  onClose,
  onDeleted,
}: {
  audience: Audience
  onClose: () => void
  onDeleted: () => void
}) {
  const preview = useDeletionPreview(true)
  const deleteAccount = useDeleteAccount()
  const [typed, setTyped] = useState("")
  const [error, setError] = useState<string | null>(null)
  const upcoming = preview.data?.upcoming_bookings ?? []
  const blocked = preview.data?.blocked_reason ?? null

  async function submit() {
    setError(null)
    try {
      await deleteAccount.mutateAsync(typed.trim())
      onDeleted()
    } catch (e: unknown) {
      setError(apiError(e))
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 md:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-account-title"
        className="max-h-[90dvh] w-full overflow-y-auto rounded-t-3xl bg-[#F6F1EC] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] text-[#14100F] md:max-w-md md:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 id="delete-account-title" className="text-lg font-black tracking-tight">
            Delete your account?
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1 text-[#14100F]/50">
            <X className="size-5" />
          </button>
        </div>

        {preview.isLoading ? (
          <p className="py-6 text-center text-sm text-[#14100F]/60">Checking your account…</p>
        ) : blocked ? (
          <>
            <p className="rounded-xl bg-white px-4 py-3 text-sm font-semibold">{blocked}</p>
            <p className="mt-3 text-sm text-[#14100F]/60">
              Once that&apos;s done, come back here to delete your account.
            </p>
            <button type="button" onClick={onClose} className="mt-5 w-full rounded-2xl bg-[#14100F] py-3.5 font-bold text-white">
              OK
            </button>
          </>
        ) : (
          <>
            <p className="text-sm font-bold">We permanently erase:</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-[#14100F]/70">
              <li>your name, email, phone and photo</li>
              <li>your saved addresses and card</li>
              <li>{KEPT[audience].erased}</li>
            </ul>
            <p className="mt-3 text-sm font-bold">We keep, without your name on them:</p>
            <p className="mt-1 text-sm text-[#14100F]/70">{KEPT[audience].kept}</p>

            {upcoming.length > 0 ? (
              <div className="mt-4 rounded-xl bg-white p-3">
                <p className="text-sm font-bold">
                  {upcoming.length === 1 ? "This upcoming booking is" : `These ${upcoming.length} upcoming bookings are`}{" "}
                  cancelled:
                </p>
                <ul className="mt-1 space-y-1 text-sm text-[#14100F]/70">
                  {upcoming.map((b) => (
                    <li key={b.id}>
                      {b.service ?? "Appointment"}, {formatBookingDate(b.starts_at)} at {formatBookingTime(b.starts_at)}
                      {b.paid ? " (paid)" : ""}
                    </li>
                  ))}
                </ul>
                {upcoming.some((b) => b.paid) ? (
                  <p className="mt-2 text-sm font-semibold text-[#8f3f4b]">
                    For a refund, email Bookings@baydspa.ca before you delete. We can&apos;t reach you afterwards.
                  </p>
                ) : null}
              </div>
            ) : null}

            <label className="mt-4 block">
              <span className="mb-1 block text-sm font-bold">Type {CONFIRM_WORD} to confirm</span>
              <input
                value={typed}
                onChange={(e) => {
                  setTyped(e.target.value)
                  setError(null)
                }}
                autoCapitalize="characters"
                autoComplete="off"
                className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-base"
              />
            </label>

            {error ? (
              <p aria-live="polite" className="mt-3 rounded-xl border border-[#8f3f4b]/25 bg-[#fff5f6] px-3 py-2 text-sm font-semibold text-[#8f3f4b]">
                {error}
              </p>
            ) : null}

            <button
              type="button"
              onClick={submit}
              disabled={typed.trim() !== CONFIRM_WORD || deleteAccount.isPending}
              className="mt-4 w-full rounded-2xl bg-[#D32F2F] py-3.5 font-bold text-white disabled:opacity-50"
            >
              {deleteAccount.isPending ? "Deleting…" : "Delete my account"}
            </button>
            <button type="button" onClick={onClose} className="mt-2 w-full rounded-2xl bg-white py-3 font-bold">
              Keep my account
            </button>
            <p className="mt-3 text-center text-sm text-[#14100F]/50">This can&apos;t be undone.</p>
          </>
        )}
      </div>
    </div>
  )
}
