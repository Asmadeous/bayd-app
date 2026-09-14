"use client"

import { useSubscriptions } from "@/lib/hooks/use-subscriptions"
import { cardClass, mutedClass } from "../app-theme"
import { SectionScreen } from "../section-screen"

const STATUS_STYLE: Record<string, string> = {
  active: "bg-[#c96c83]/12 text-[#c96c83]",
  paused: "bg-black/8 text-[#101217]/60",
  cancelled: "bg-[#8f3f4b]/12 text-[#8f3f4b]",
}

export default function AppSubscriptionsScreen() {
  const { data: subs = [], isLoading } = useSubscriptions()

  return (
    <SectionScreen title="Subscriptions">
      {isLoading ? (
        <ListSkeleton />
      ) : subs.length === 0 ? (
        <Empty text="No subscriptions yet." />
      ) : (
        <ul className="space-y-3 pb-6">
          {subs.map((s) => (
            <li key={s.id} className={`p-4 ${cardClass}`}>
              <div className="flex items-center justify-between">
                <span className={`rounded-full px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.1em] ${STATUS_STYLE[s.status] ?? "bg-black/8 text-[#101217]/60"}`}>
                  {s.status}
                </span>
                {s.price && <span className="text-sm font-extrabold">${Number(s.price).toFixed(2)}</span>}
              </div>
              <p className="mt-2 text-sm font-bold">{s.service_name ?? "Subscription"}</p>
              <p className={`mt-0.5 text-xs ${mutedClass}`}>{s.frequency_label}</p>
              {s.next_charge?.on && (
                <p className={`mt-1 text-xs ${mutedClass}`}>
                  Next: {new Date(s.next_charge.on).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  {s.next_charge.amount ? ` · $${Number(s.next_charge.amount).toFixed(2)}` : ""}
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
        <div key={i} className="h-24 animate-pulse rounded-3xl bg-black/[0.04]" />
      ))}
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <p className={`rounded-3xl bg-white p-8 text-center text-sm shadow-sm ${mutedClass}`}>{text}</p>
}
