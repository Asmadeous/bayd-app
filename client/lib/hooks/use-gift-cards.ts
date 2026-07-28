"use client"

import { useQuery } from "@tanstack/react-query"
import api from "@/lib/api"

export interface GiftCard {
  id: number
  code: string
  initial_balance: string
  current_balance: string
  recipient_email: string | null
  recipient_name: string | null
  sender_name: string | null
  message: string | null
  expires_at: string | null
  active: boolean
  delivered_at: string | null
  created_at: string
  purchaser?: { id: number; email: string; name: string } | null
}

// Gift cards the current user purchased.
export function useGiftCards() {
  return useQuery({
    queryKey: ["gift-cards"],
    queryFn: () => api.get<{ data: GiftCard[] }>("/gift_cards").then((r) => r.data.data),
  })
}
