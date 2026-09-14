// Shapes mirror the Rails serializers/broadcasts (2b/2c).

export interface ChatMessage {
  id: number
  conversation_id: number
  sender_id: number
  body: string
  read_at: string | null
  created_at: string
}

export interface Conversation {
  id: number
  last_message_at: string | null
  created_at: string
  other_participant: {
    id: number
    first_name: string | null
    last_name: string | null
    role: string
  } | null
  unread_count: number
}

// ChatChannel broadcasts: a bare message (no `type`), or an event with a `type`.
export type ChatEvent =
  | ChatMessage
  | { type: "read"; conversation_id: number; reader_id: number; at: string }
  | { type: "typing"; conversation_id: number; user_id: number; typing: boolean }
  | { type: "presence"; user_id: number; online: boolean }

export function isChatMessage(e: ChatEvent): e is ChatMessage {
  return !("type" in e)
}
