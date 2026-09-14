"use client"

// Shared UI plumbing for the purpose-built mobile apps (customer + staff):
// toasts (success / warning / error) and a confirm sheet for destructive actions
// (logout, abandon booking, abandon cart, delete). Self-contained - no Base UI,
// no website dependency - so it works inside the Capacitor bundle. Mount
// <AppUIProvider> once at each app's layout; use useToast() / useConfirm()
// anywhere below it.

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { Check, TriangleAlert, X } from "lucide-react"

import { hapticTap } from "@/lib/native/haptics"

// ── Types ───────────────────────────────────────────────────────────────────

type ToastVariant = "default" | "success" | "warning" | "error"
type ToastInput = { title: string; description?: string; variant?: ToastVariant }
type ActiveToast = ToastInput & { id: number }

type ConfirmOptions = {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  // "danger" = red primary (delete/abandon); "default" = blush primary.
  tone?: "danger" | "default"
}
type PendingConfirm = ConfirmOptions & { id: number; resolve: (ok: boolean) => void }

type AppUIContextValue = {
  toast: (input: ToastInput) => void
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const AppUIContext = createContext<AppUIContextValue | null>(null)

export function useToast() {
  const ctx = useContext(AppUIContext)
  if (!ctx) throw new Error("useToast must be used inside <AppUIProvider>")
  return { toast: ctx.toast }
}

// Returns confirm(options) -> Promise<boolean>. Resolves true if the user
// confirms, false if they cancel or dismiss.
export function useConfirm() {
  const ctx = useContext(AppUIContext)
  if (!ctx) throw new Error("useConfirm must be used inside <AppUIProvider>")
  return ctx.confirm
}

// ── Provider ────────────────────────────────────────────────────────────────

export function AppUIProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ActiveToast[]>([])
  const [pending, setPending] = useState<PendingConfirm | null>(null)
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  const dismissToast = useCallback((id: number) => {
    setToasts((cur) => cur.filter((t) => t.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const toast = useCallback(
    (input: ToastInput) => {
      const id = Date.now() + Math.random()
      setToasts((cur) => [...cur.slice(-2), { ...input, id }])
      timers.current.set(
        id,
        setTimeout(() => dismissToast(id), 5000),
      )
    },
    [dismissToast],
  )

  const confirm = useCallback((options: ConfirmOptions) => {
    hapticTap()
    return new Promise<boolean>((resolve) => {
      setPending({ ...options, id: Date.now(), resolve })
    })
  }, [])

  function resolveConfirm(ok: boolean) {
    if (pending) {
      pending.resolve(ok)
      setPending(null)
    }
  }

  const value = useMemo<AppUIContextValue>(() => ({ toast, confirm }), [toast, confirm])

  return (
    <AppUIContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
      {pending && <ConfirmSheet pending={pending} onResolve={resolveConfirm} />}
    </AppUIContext.Provider>
  )
}

// ── Toast UI ────────────────────────────────────────────────────────────────

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ActiveToast[]
  onDismiss: (id: number) => void
}) {
  if (toasts.length === 0) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex flex-col items-center gap-2 px-4 pt-[calc(0.75rem+env(safe-area-inset-top))]">
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  )
}

// Accent colors are drawn from the BAYD palette (ink #14100F, blush #C96C83,
// rose, gold #C9A45C, plum #8f3f4b) so a toast reads as part of the app, not a
// generic OS notification. Error uses the brand's deep plum-red; warning the
// brand gold; success a warm sage that harmonizes with the cream surface.
function ToastCard({ toast, onDismiss }: { toast: ActiveToast; onDismiss: () => void }) {
  const variant = toast.variant ?? "default"
  const accent =
    variant === "error"
      ? { bar: "#8f3f4b", icon: "#8f3f4b", tint: "#8f3f4b14", Icon: X }
      : variant === "warning"
        ? { bar: "#C9A45C", icon: "#B58A3C", tint: "#C9A45C1f", Icon: TriangleAlert }
        : variant === "success"
          ? { bar: "#C96C83", icon: "#C96C83", tint: "#C96C8314", Icon: Check }
          : { bar: "#C96C83", icon: "#C96C83", tint: "#C96C8314", Icon: null as typeof Check | null }

  return (
    <button
      type="button"
      onClick={onDismiss}
      className="pointer-events-auto flex w-full max-w-sm items-start gap-3 overflow-hidden rounded-2xl border px-3.5 py-3 text-left shadow-[0_10px_30px_-10px_rgba(20,16,15,0.35)] animate-in fade-in slide-in-from-top-2"
      style={{ background: "#FBF8F4", borderColor: accent.bar + "33" }}
    >
      <span
        className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full"
        style={{ background: accent.tint, color: accent.icon }}
      >
        {accent.Icon ? <accent.Icon className="size-4" aria-hidden /> : <span className="size-2 rounded-full" style={{ background: accent.icon }} />}
      </span>
      <span className="min-w-0 flex-1 pt-0.5">
        <span className="block text-sm font-bold text-[#14100F]">{toast.title}</span>
        {toast.description && (
          <span className="mt-0.5 block text-xs leading-5 text-[#14100F]/55">{toast.description}</span>
        )}
      </span>
    </button>
  )
}

// ── Confirm sheet ─────────────────────────────────────────────────────────────

function ConfirmSheet({
  pending,
  onResolve,
}: {
  pending: PendingConfirm
  onResolve: (ok: boolean) => void
}) {
  const danger = pending.tone === "danger"
  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center">
      {/* Scrim */}
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => onResolve(false)}
        className="absolute inset-0 bg-black/50 animate-in fade-in"
      />
      {/* Sheet */}
      <div
        role="alertdialog"
        aria-modal="true"
        className="relative w-full max-w-md rounded-t-3xl px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-5 shadow-[0_-8px_40px_-8px_rgba(20,16,15,0.3)] animate-in slide-in-from-bottom"
        style={{ background: "#F6F1EC" }}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-black/10" />
        <div className="flex items-start gap-3">
          <span
            className="grid size-10 shrink-0 place-items-center rounded-full"
            style={{ background: danger ? "#8f3f4b18" : "#C96C8318", color: danger ? "#8f3f4b" : "#C96C83" }}
          >
            <TriangleAlert className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-black leading-tight tracking-tight text-[#14100F]">{pending.title}</h2>
            {pending.message && (
              <p className="mt-1 text-sm leading-6 text-[#14100F]/60">{pending.message}</p>
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => onResolve(true)}
            className="w-full rounded-xl px-4 py-3.5 text-base font-bold text-white"
            style={{ background: danger ? "#8f3f4b" : "#C96C83" }}
          >
            {pending.confirmLabel ?? (danger ? "Delete" : "Confirm")}
          </button>
          <button
            type="button"
            onClick={() => onResolve(false)}
            className="w-full rounded-xl border border-black/10 bg-white px-4 py-3.5 text-base font-bold text-[#14100F]"
          >
            {pending.cancelLabel ?? "Cancel"}
          </button>
        </div>
      </div>
    </div>
  )
}
