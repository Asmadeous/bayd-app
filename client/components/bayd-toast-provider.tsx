"use client"

import { X, Check, TriangleAlert } from "lucide-react"
import { createContext, useContext, useMemo, useState, type ReactNode } from "react"

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

type ToastVariant = "default" | "success" | "error" | "warning"
type ToastInput = { title: string; description?: string; variant?: ToastVariant }
type ActiveToast = ToastInput & { id: number }

type ToastContextValue = { toast: (input: ToastInput) => void }
const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error("useToast must be used inside BaydToastProvider")
  return context
}

export function BaydToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ActiveToast[]>([])

  const value = useMemo<ToastContextValue>(() => ({
    toast: (input) => setToasts((current) => [...current.slice(-2), { ...input, id: Date.now() }]),
  }), [])

  function dismiss(id: number) {
    setToasts((current) => current.filter((item) => item.id !== id))
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastProvider swipeDirection="right">
        {toasts.map((item) => {
          const isError = item.variant === "error"
          const isSuccess = item.variant === "success"
          const isWarning = item.variant === "warning"
          const Icon = isError ? X : isSuccess ? Check : isWarning ? TriangleAlert : null
          const iconColor = isError
            ? "text-[#b75c68]"
            : isWarning
              ? "text-[#c98a2e]"
              : "text-[#8a9a6a]"

          return (
            <Toast key={item.id} onOpenChange={(open) => !open && dismiss(item.id)} duration={6000}>
              <div className="flex gap-3">
                {Icon ? <Icon className={`mt-0.5 size-5 ${iconColor}`} /> : null}
                <div className="min-w-0 flex-1">
                  <ToastTitle>{item.title}</ToastTitle>
                  {item.description ? <ToastDescription>{item.description}</ToastDescription> : null}
                </div>
              </div>
              <ToastClose />
            </Toast>
          )
        })}
        <ToastViewport />
      </ToastProvider>
    </ToastContext.Provider>
  )
}
