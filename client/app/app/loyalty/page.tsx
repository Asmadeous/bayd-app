"use client"

import { useLoyalty } from "@/lib/hooks/use-account"
import { cardClass, displayClass, eyebrowClass, mutedClass } from "../app-theme"
import { SectionScreen } from "../section-screen"

export default function AppLoyaltyScreen() {
  const { data, isLoading } = useLoyalty()
  const history = data?.loyalty_transactions ?? []

  return (
    <SectionScreen title="Loyalty">
      {isLoading ? (
        <div className="h-32 animate-pulse rounded-3xl bg-black/[0.04]" />
      ) : (
        <div className="space-y-5 pb-6">
          <div className="rounded-3xl bg-[#14100F] p-6 text-white shadow-[0_16px_40px_-16px_rgba(20,16,15,0.5)]">
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-white/50">Points balance</p>
            <p className={`${displayClass} mt-1 text-5xl`}>{data?.points_balance ?? 0}</p>
          </div>

          <div>
            <h2 className={`mb-2 ${eyebrowClass}`}>History</h2>
            {history.length === 0 ? (
              <p className={`rounded-3xl bg-white p-6 text-center text-sm shadow-sm ${mutedClass}`}>No points activity yet.</p>
            ) : (
              <ul className="space-y-2">
                {history.map((t) => (
                  <li key={t.id} className={`flex items-center justify-between p-4 ${cardClass}`}>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold capitalize">{t.description || t.kind}</p>
                      <p className={`text-xs ${mutedClass}`}>
                        {new Date(t.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                    <span className={`text-sm font-extrabold ${t.points >= 0 ? "text-[#c96c83]" : "text-[#8f3f4b]"}`}>
                      {t.points >= 0 ? "+" : ""}{t.points}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </SectionScreen>
  )
}
