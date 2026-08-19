"use client"

import { X, Check } from "lucide-react"
import { createContext, useContext, useMemo, useState, type ReactNode } from "react"

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

type ToastVariant = "default" | "success" | "error"
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
          const Icon = isError ? X : isSuccess ? Check : null

          return (
            <Toast key={item.id} onOpenChange={(open) => !open && dismiss(item.id)} duration={6000}>
              <div className="flex gap-3">
                {Icon ? (
                  <Icon className={isError ? "mt-0.5 size-5 text-[#b75c68]" : "mt-0.5 size-5 text-[#8a9a6a]"} />
                ) : null}
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
