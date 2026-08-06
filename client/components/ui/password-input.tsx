"use client"

import { useState, type InputHTMLAttributes } from "react"
import { Eye, EyeOff } from "lucide-react"

import { cn } from "@/lib/utils"

type PasswordInputProps = InputHTMLAttributes<HTMLInputElement>

export function PasswordInput({ className, ...props }: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <div className="relative">
      <input
        {...props}
        className={cn(className, "pr-11")}
        type={isVisible ? "text" : "password"}
      />
      <button
        aria-label={isVisible ? "Hide password" : "Show password"}
        className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center text-[#5f6268] transition-colors hover:text-[#101217]"
        onClick={() => setIsVisible((visible) => !visible)}
        type="button"
      >
        {isVisible ? (
          <EyeOff aria-hidden="true" className="size-4" />
        ) : (
          <Eye aria-hidden="true" className="size-4" />
        )}
      </button>
    </div>
  )
}
