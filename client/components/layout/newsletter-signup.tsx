"use client"

import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { Check, Send } from "lucide-react"

import api from "@/lib/api"

export function NewsletterSignup() {
  const [email, setEmail] = useState("")

  const subscribe = useMutation({
    mutationFn: () => api.post("/newsletter/subscribe", { email, source: "footer" }),
    onSuccess: () => setEmail(""),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    subscribe.mutate()
  }

  if (subscribe.isSuccess) {
    return (
      <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-white">
        <Check aria-hidden="true" className="size-4 text-[#c96c83]" />
        You&apos;re subscribed — watch for new posts in your inbox.
      </p>
    )
  }

  return (
    <form className="mt-4" onSubmit={handleSubmit}>
      <div className="flex max-w-sm border border-white/20 focus-within:border-white/40">
        <input
          aria-label="Email address"
          className="h-11 w-full bg-transparent px-3 text-sm text-white placeholder:text-white/45 outline-none"
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          type="email"
          value={email}
        />
        <button
          aria-label="Subscribe"
          className="flex shrink-0 items-center gap-1.5 bg-[#c96c83] px-4 text-sm font-bold text-white transition-colors hover:bg-[#b85f74] disabled:opacity-60"
          disabled={subscribe.isPending}
          type="submit"
        >
          <Send aria-hidden="true" className="size-3.5" />
          {subscribe.isPending ? "..." : "Subscribe"}
        </button>
      </div>
      {subscribe.isError ? (
        <p className="mt-2 text-xs font-medium text-red-300">Something went wrong — try again.</p>
      ) : null}
    </form>
  )
}
