"use client"

import { useState } from "react"
import { Check, Copy, Gift } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { StatCard } from "@/components/dashboard/stat-card"
import { useLoyalty, useReferral } from "@/lib/hooks/use-account"

export default function CustomerLoyaltyPage() {
  const { data: loyalty, isLoading } = useLoyalty()
  const { data: referral } = useReferral()
  const [copied, setCopied] = useState(false)

  const txns = loyalty?.loyalty_transactions ?? []
  const earned = txns.filter((t) => t.points > 0).reduce((s, t) => s + t.points, 0)
  const redeemed = txns.filter((t) => t.points < 0).reduce((s, t) => s + Math.abs(t.points), 0)

  function copyReferral() {
    if (!referral?.url) return
    navigator.clipboard.writeText(referral.url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Loyalty Program"
        subtitle="Earn points on every booking and redeem for discounts"
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard label="Points Balance" value={isLoading ? "—" : loyalty?.points_balance ?? 0} accent />
        <StatCard label="Points Earned" value={isLoading ? "—" : earned} sub="All time" />
        <StatCard label="Points Redeemed" value={isLoading ? "—" : redeemed} sub="All time" />
      </div>

      {/* Referral */}
      {referral && (
        <div className="rounded-xl border border-black/8 bg-white p-6">
          <div className="flex items-center gap-2.5 mb-3">
            <Gift className="size-4 text-[#c96c83]" />
            <h3 className="font-semibold text-sm text-[#101217]">Refer a friend</h3>
          </div>
          <p className="text-sm text-[#5f6268] mb-4">
            Share your link. When a friend completes their first booking, you earn{" "}
            <span className="font-semibold text-[#101217]">{referral.points_per_referral} points</span>.
            You&apos;ve referred {referral.referrals_count} so far.
          </p>
          <div className="flex gap-2">
            <input
              readOnly
              value={referral.url}
              className="flex-1 h-10 border border-black/15 rounded-lg px-3 text-sm text-[#5f6268] bg-black/2"
            />
            <button
              onClick={copyReferral}
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg text-sm font-semibold text-white"
              style={{ background: "#c96c83" }}
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}

      {/* History */}
      <div className="rounded-xl border border-black/8 bg-white p-6">
        <h3 className="font-semibold text-sm text-[#101217] mb-4">Points history</h3>
        {isLoading ? (
          <p className="text-sm text-[#5f6268]">Loading…</p>
        ) : txns.length === 0 ? (
          <p className="text-sm text-[#5f6268] py-6 text-center">
            No points activity yet. Complete a booking to start earning.
          </p>
        ) : (
          <div className="divide-y divide-black/5">
            {txns.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm text-[#101217]">{t.description || t.kind}</p>
                  <p className="text-xs text-[#5f6268]">{new Date(t.created_at).toLocaleDateString("en-CA")}</p>
                </div>
                <span
                  className="text-sm font-semibold"
                  style={{ color: t.points >= 0 ? "#5a9e5a" : "#d4754a" }}
                >
                  {t.points >= 0 ? "+" : ""}{t.points}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
