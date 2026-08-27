"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Mail } from "lucide-react"

import { Button } from "@/components/ui/button"
import api from "@/lib/api"
import type { Conversation } from "@/lib/cable/chat-types"

// Opens (or reuses) a conversation with the booking's technician and jumps to the
// messages page. Uses the 2b POST /conversations { user_id } find-or-create.
export function MessageTechButton({ techUserId }: { techUserId?: number }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  if (!techUserId) return null

  async function open() {
    setLoading(true)
    try {
      await api.post<Conversation>("/conversations", { user_id: techUserId })
      router.push("/dashboard/customer/messages")
    } catch {
      // best-effort; the messages page still lists any existing conversation
      router.push("/dashboard/customer/messages")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button type="button" variant="secondary" size="xs" onClick={open} disabled={loading}>
      <Mail className="mr-1 size-3.5" />
      Message
    </Button>
  )
}
