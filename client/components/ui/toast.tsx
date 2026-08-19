"use client"

import * as ToastPrimitive from "@radix-ui/react-toast"
import { X } from "lucide-react"
import type { ComponentPropsWithoutRef } from "react"

import { cn } from "@/lib/utils"

const ToastProvider = ToastPrimitive.Provider
const ToastViewport = ({ className, ...props }: ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport>) => (
  <ToastPrimitive.Viewport
    className={cn(
      "fixed right-4 top-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3 outline-none sm:right-6 sm:top-6",
      className
    )}
    {...props}
  />
)

const Toast = ({ className, ...props }: ComponentPropsWithoutRef<typeof ToastPrimitive.Root>) => (
  <ToastPrimitive.Root
    className={cn(
      "group relative overflow-hidden rounded-2xl border border-[#e7c6c9] bg-[#fffaf7] px-5 py-4 text-[#272326] shadow-[0_18px_45px_rgba(91,57,48,0.18)] data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-right-full",
      className
    )}
    {...props}
  />
)

const ToastTitle = ({ className, ...props }: ComponentPropsWithoutRef<typeof ToastPrimitive.Title>) => (
  <ToastPrimitive.Title
    className={cn("pr-7 text-sm font-extrabold tracking-tight", className)}
    {...props}
  />
)

const ToastDescription = ({ className, ...props }: ComponentPropsWithoutRef<typeof ToastPrimitive.Description>) => (
  <ToastPrimitive.Description
    className={cn("mt-1 pr-4 text-xs leading-5 text-[#6e6262]", className)}
    {...props}
  />
)

const ToastClose = ({ className, ...props }: ComponentPropsWithoutRef<typeof ToastPrimitive.Close>) => (
  <ToastPrimitive.Close
    className={cn(
      "absolute right-3 top-3 rounded-full p-1 text-[#9b777a] opacity-70 transition hover:bg-[#f4e1df] hover:text-[#8f4f5b] focus:outline-none focus:ring-2 focus:ring-[#c96c83]/30",
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="size-4" />
    <span className="sr-only">Close</span>
  </ToastPrimitive.Close>
)

export { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport }
