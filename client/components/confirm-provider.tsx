"use client"

// App-wide confirm dialog for destructive actions on the WEB (logout, abandon
// cart, delete). Mirrors the mobile useConfirm() API so call sites are identical
// across web and app. Mount <ConfirmProvider> once at the root; call
// useConfirm()(options) -> Promise<boolean> anywhere.

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react"
import { TriangleAlert } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type ConfirmOptions = {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: "danger" | "default"
}
type Pending = ConfirmOptions & { resolve: (ok: boolean) => void }

const ConfirmContext = createContext<((o: ConfirmOptions) => Promise<boolean>) | null>(null)

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error("useConfirm must be used inside <ConfirmProvider>")
  return ctx
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null)

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => setPending({ ...options, resolve })),
    [],
  )

  function resolve(ok: boolean) {
    if (pending) {
      pending.resolve(ok)
      setPending(null)
    }
  }

  const value = useMemo(() => confirm, [confirm])
  const danger = pending?.tone === "danger"

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <AlertDialog open={!!pending} onOpenChange={(open) => !open && resolve(false)}>
        {pending && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <div className="flex items-start gap-3">
                <span
                  className="grid size-10 shrink-0 place-items-center rounded-full"
                  style={{
                    background: danger ? "#b3453f18" : "#c96c8318",
                    color: danger ? "#b3453f" : "#c96c83",
                  }}
                >
                  <TriangleAlert className="size-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <AlertDialogTitle>{pending.title}</AlertDialogTitle>
                  {pending.message && (
                    <AlertDialogDescription>{pending.message}</AlertDialogDescription>
                  )}
                </div>
              </div>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => resolve(false)}>
                {pending.cancelLabel ?? "Cancel"}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => resolve(true)}
                style={danger ? { background: "#b3453f" } : undefined}
              >
                {pending.confirmLabel ?? (danger ? "Delete" : "Confirm")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </ConfirmContext.Provider>
  )
}
