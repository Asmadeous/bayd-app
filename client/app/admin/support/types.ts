import type { SupportMessage } from "@/lib/hooks/use-support-chat"

// What /admin/support_threads returns (the web Support Chat page's shapes).
export interface SupportThreadRow {
  id: number
  name: string
  email: string
  status: "open" | "closed"
  user_id: number | null
  last_message_at: string | null
  created_at: string
  unread_count: number
  last_message: string | null
}

export interface SupportThreadDetail extends SupportThreadRow {
  messages: SupportMessage[]
}
