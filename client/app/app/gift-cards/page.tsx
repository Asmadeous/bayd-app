"use client"

import { useGiftCards } from "@/lib/hooks/use-gift-cards"
import { Gift } from "lucide-react"
import { EmptyState } from "../empty-state"
import { SectionScreen } from "../section-screen"

export default function AppGiftCardsScreen() {
  const { data: cards = [], isLoading } = useGiftCards()

  return (
    <SectionScreen title="Gift cards">
      {isLoading ? (
        <ListSkeleton />
      ) : cards.length === 0 ? (
        <EmptyState icon={Gift} title="No gift cards yet" text="Gift cards you buy show up here with their code and balance." action={{ label: "Shop gift cards", href: "/app/shop?tab=gift-cards" }} />
      ) : (
        <ul className="space-y-3 pb-6">
          {cards.map((c) => (
            <li key={c.id} className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#c96c83] to-[#a9526a] p-5 text-white shadow-[0_12px_30px_-14px_rgba(201,108,131,0.7)]">
              <div className="flex items-center justify-between">
                <span className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-white/70">Gift card</span>
                <span className={`rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase ${c.active ? "bg-white/20" : "bg-black/20"}`}>
                  {c.active ? "Active" : "Inactive"}
                </span>
              </div>
              <p className="mt-3 font-mono text-lg font-bold tracking-widest">{c.code}</p>
              <div className="mt-3 flex items-end justify-between">
                <div>
                  <p className="text-[0.62rem] uppercase tracking-wide text-white/60">Balance</p>
                  <p className="text-2xl font-extrabold">${Number(c.current_balance).toFixed(2)}</p>
                </div>
                <p className="text-xs text-white/70">of ${Number(c.initial_balance).toFixed(2)}</p>
              </div>
              {c.expires_at && (
                <p className="mt-2 text-xs text-white/60">
                  Expires {new Date(c.expires_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </SectionScreen>
  )
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1].map((i) => (
        <div key={i} className="h-40 animate-pulse rounded-3xl bg-black/[0.04]" />
      ))}
    </div>
  )
}

