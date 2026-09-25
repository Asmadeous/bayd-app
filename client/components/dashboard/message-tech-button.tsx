"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Lock, Mail } from "lucide-react"

import { Button } from "@/components/ui/button"
import api from "@/lib/api"
import type { Conversation } from "@/lib/cable/chat-types"
import { useBookingAccess, windowNotStartedMessage } from "@/lib/booking-access"
import { useToast } from "@/components/bayd-toast-provider"
import type { Booking } from "@/lib/hooks/use-bookings"

// Opens (or reuses) a conversation with the booking's technician and jumps to the
// messages page. Uses the 2b POST /conversations { user_id } find-or-create.
// Locked until the booking's contact window opens (30 min before the start).
export function MessageTechButton({ booking }: { booking: Booking }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const access = useBookingAccess(booking)
  const { toast } = useToast()
  const techUserId = booking.employee_profile?.user_id

  if (!techUserId || !access.active) return null
  if (!access.open) {
    return (
      <Button
        type="button"
        variant="secondary"
        size="xs"
        className="opacity-60"
        onClick={() =>
          toast({ title: "Not open yet", description: windowNotStartedMessage(access.opensLabel, "message your technician"), variant: "error" })
        }
      >
        <Lock className="mr-1 size-3.5" />
        Message · opens {access.opensLabel}
      </Button>
    )
  }

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
